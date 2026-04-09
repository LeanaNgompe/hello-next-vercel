'use client';

import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';
import { FiRotateCcw, FiLock, FiArrowRight } from 'react-icons/fi';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Caption {
  id: string;
  content: string;
  created_datetime_utc: string;
  images: { url: string } | null;
  avg_score: number | string;
  vote_count: number;
  user_vote: number;
}

const SCALE_LABELS: Record<number, string> = {
  2: 'not funny at all',
  3: 'not very funny',
  4: 'meh',
  5: 'funny',
  6: 'very funny',
};

const DIDNT_GET_IT_LABEL = 'didnt get it';

export default function CaptionsList({ 
  initialCaptions, 
  user, 
  mode = 'gallery' 
}: { 
  initialCaptions: Caption[], 
  user: any,
  mode?: 'gallery' | 'vote'
}) {
  const votableCaptions = useMemo(() => {
    return initialCaptions.filter(c => c.images?.url);
  }, [initialCaptions]);
  
  const [captions, setCaptions] = useState<Caption[]>(votableCaptions);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!user) return 0;
    const firstUnvoted = votableCaptions.findIndex(c => c.user_vote === 0);
    return firstUnvoted === -1 ? votableCaptions.length : firstUnvoted;
  });
  const [voteHistory, setVoteHistory] = useState<{ captionId: string, vote: number }[]>([]);
  const [isVoting, setIsVoting] = useState(false);

  const currentCaption = captions[currentIndex];
  const isLastCard = currentIndex >= captions.length;

  /** Handles the vote logic */
  const handleVote = async (newValue: number) => {
    if (!user || isVoting || isLastCard) return;
    setIsVoting(true);

    const captionId = currentCaption.id;
    
    // Update local state immediately for snappy UI
    setCaptions(prev => prev.map(c => {
      if (c.id === captionId) {
        return { ...c, user_vote: newValue };
      }
      return c;
    }));

    // Persist to Supabase
    const { error } = await supabase
      .from('caption_votes')
      .upsert(
        { 
          caption_id: captionId, 
          profile_id: user.id, 
          vote_value: newValue, 
          created_datetime_utc: new Date().toISOString(), 
          modified_datetime_utc: new Date().toISOString()
        },
        { onConflict: 'caption_id,profile_id' }
      );

    if (error) {
      console.error('Voting failed:', error.message);
      setCaptions(prev => prev.map(c => c.id === captionId ? { ...c, user_vote: currentCaption.user_vote } : c));
      alert(`Could not save vote: ${error.message}`);
      setIsVoting(false);
      return;
    }

    setVoteHistory(prev => [...prev, { captionId, vote: newValue }]);
    
    // Snappy transition to next card
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsVoting(false);
    }, 150);
  };

  /** Reverses the last action */
  const handleUndo = async () => {
    if (!user || isVoting || voteHistory.length === 0) return;

    const prevIndex = currentIndex - 1;
    const captionToUndo = captions[prevIndex];

    const { error } = await supabase
      .from('caption_votes')
      .delete()
      .eq('caption_id', captionToUndo.id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Undo failed:', error.message);
      alert('Failed to undo vote.');
      return;
    }

    setCaptions(prev => prev.map(c => {
      if (c.id === captionToUndo.id) {
        return { ...c, user_vote: 0 };
      }
      return c;
    }));
    
    setCurrentIndex(prevIndex);
    setVoteHistory(prev => prev.slice(0, -1));
  };

  // --- STATIC VOTE UI (NO SWIPE, COMPACT) ---
  if (mode === 'vote' && user) {
    return (
      <div className="flex flex-col items-center max-w-xl mx-auto space-y-4">
        {!isLastCard ? (
          <>
            {/* Image Preview - Compact fixed height to avoid scrolling */}
            <div className="relative w-full aspect-[16/10] md:h-72 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden flex-shrink-0">
              {currentCaption.images?.url && (
                <img 
                  src={currentCaption.images.url} 
                  alt="Caption context" 
                  className="w-full h-full object-cover" 
                />
              )}
            </div>

            {/* Caption Content */}
            <div className="w-full text-center px-4 py-2">
              <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                "{currentCaption.content}"
              </p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                {new Date(currentCaption.created_datetime_utc).toLocaleDateString()}
              </p>
            </div>

            {/* Voting Buttons Grid */}
            <div className="w-full space-y-3 px-4">
              <div className="flex gap-2 justify-center">
                {[2, 3, 4, 5, 6].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleVote(val)}
                    disabled={isVoting}
                    className="flex-1 py-4 md:py-6 px-1 bg-white dark:bg-gray-900 border-2 border-gray-50 dark:border-gray-800 rounded-2xl hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 group shadow-sm disabled:opacity-50"
                  >
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 uppercase tracking-tighter">
                      {val === 2 ? 'Not' : val === 6 ? 'Very' : ''}
                    </span>
                    <span className="text-xs md:text-sm font-black text-gray-800 dark:text-gray-100 text-center leading-none">
                      {SCALE_LABELS[val]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => handleVote(1)}
                  disabled={isVoting}
                  className="w-full md:w-2/3 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 shadow-sm disabled:opacity-50"
                >
                  {DIDNT_GET_IT_LABEL}
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <button 
                  onClick={handleUndo} 
                  disabled={isVoting || voteHistory.length === 0} 
                  className="inline-flex items-center gap-2 text-xs font-black text-gray-400 hover:text-yellow-600 transition-colors disabled:opacity-0"
                >
                  <FiRotateCcw className="w-3.5 h-3.5" /> Undo Last Vote
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center space-y-8 py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800 w-full px-8 shadow-xl shadow-blue-500/5">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-2 animate-bounce">🎉</div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">All Caught Up!</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">You've ranked all available captions for now.</p>
            </div>
            <Link 
              href="/captions" 
              className="flex items-center justify-center gap-3 mx-auto px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black transition-all shadow-xl shadow-blue-500/25 hover:scale-[1.02]"
            >
              Browse Gallery <FiArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // --- MASONRY GALLERY (GALLERY MODE) ---
  return (
    <div className="space-y-12">
      {!user && (
        <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-blue-500/20 max-w-5xl mx-auto">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-black flex items-center justify-center md:justify-start gap-3">
              <FiLock className="w-8 h-8" /> Join the Community
            </h2>
            <p className="text-blue-100 text-lg font-medium">Log in to start voting and unlock the discovery experience.</p>
          </div>
          <Link 
            href="/auth/login" 
            className="px-10 py-5 bg-white text-blue-600 rounded-2xl font-black hover:bg-gray-100 transition-all shadow-xl shadow-black/10 flex-shrink-0"
          >
            Log In to Vote
          </Link>
        </div>
      )}

      {user && mode === 'gallery' && (
        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl max-w-5xl mx-auto border border-gray-800 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-blue-600/30 group-hover:scale-110 transition-transform">🗳️</div>
            <div>
              <h3 className="font-black text-2xl mb-1 tracking-tight">Ready to rank?</h3>
              <p className="text-gray-400 font-medium">Help us find the funniest captions of the day.</p>
            </div>
          </div>
          <Link 
            href="/captions/vote" 
            className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-black hover:bg-gray-100 transition-all flex items-center gap-2 relative z-10 shadow-lg"
          >
            Vote Now <FiArrowRight />
          </Link>
        </div>
      )}

      <div className="space-y-8">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-4">Community Curation</h3>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-8 space-y-8 px-2 md:px-0">
          {captions.map((caption) => (
            <div 
              key={caption.id} 
              className="break-inside-avoid group flex flex-col bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-50 dark:border-gray-800 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              <div className="w-full aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-800">
                {caption.images?.url && (
                  <img 
                    src={caption.images.url} 
                    alt="Caption context" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                )}
              </div>
              
              <div className="p-6 space-y-2 bg-white dark:bg-gray-900">
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-snug">
                  {caption.content}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                    {new Date(caption.created_datetime_utc).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {captions.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-4xl">🏜️</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No captions available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
