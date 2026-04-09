'use client';

import { useState, useMemo, useEffect } from 'react';
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

/** Shuffles an array in place (Fisher-Yates) */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function CaptionsList({ 
  initialCaptions, 
  user, 
  mode = 'gallery' 
}: { 
  initialCaptions: Caption[], 
  user: any,
  mode?: 'gallery' | 'vote'
}) {
  const processedInitial = useMemo(() => {
    const filtered = initialCaptions.filter(c => c.images?.url);
    // Randomize order for both gallery and vote modes to prevent visual redundancy
    return shuffleArray(filtered);
  }, [initialCaptions]);
  
  const [captions, setCaptions] = useState<Caption[]>(processedInitial);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!user) return 0;
    const firstUnvoted = processedInitial.findIndex(c => c.user_vote === 0);
    return firstUnvoted === -1 ? processedInitial.length : firstUnvoted;
  });

  const [voteHistory, setVoteHistory] = useState<{ captionId: string, vote: number }[]>([]);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    setCaptions(processedInitial);
    if (user) {
      const firstUnvoted = processedInitial.findIndex(c => c.user_vote === 0);
      setCurrentIndex(firstUnvoted === -1 ? processedInitial.length : firstUnvoted);
    }
  }, [processedInitial, user]);

  const currentCaption = captions[currentIndex];
  const isLastCard = currentIndex >= captions.length;

  const handleVote = async (newValue: number) => {
    if (!user || isVoting || isLastCard) return;
    setIsVoting(true);

    const captionId = currentCaption.id;
    setCaptions(prev => prev.map(c => c.id === captionId ? { ...c, user_vote: newValue } : c));

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
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsVoting(false);
    }, 150);
  };

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

    setCaptions(prev => prev.map(c => c.id === captionToUndo.id ? { ...c, user_vote: 0 } : c));
    setCurrentIndex(prevIndex);
    setVoteHistory(prev => prev.slice(0, -1));
  };

  // --- EDITORIAL VOTE UI ---
  if (mode === 'vote' && user) {
    return (
      <div className="flex flex-col items-center max-w-2xl mx-auto py-10">
        {!isLastCard ? (
          <div className="w-full bg-[#FAF7F2] border border-[#2B2B2B] rounded-sm p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-1/2 aspect-square bg-[#E8E2D9] border border-[#2B2B2B] rounded-sm overflow-hidden">
                {currentCaption.images?.url && (
                  <img src={currentCaption.images.url} alt="Context" className="w-full h-full object-cover grayscale-[0.2]" />
                )}
              </div>
              <div className="w-full md:w-1/2 space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#8C8C8C] tracking-widest uppercase">Current Submission</span>
                  <p className="text-2xl font-black text-[#2B2B2B] leading-tight italic">
                    "{currentCaption.content}"
                  </p>
                </div>
                
                <div className="pt-6 border-t border-[#2B2B2B] space-y-4">
                  <span className="text-[10px] font-bold text-[#2B2B2B] tracking-widest uppercase">Rank this entry</span>
                  <div className="grid grid-cols-1 gap-2">
                    {[2, 3, 4, 5, 6].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleVote(val)}
                        disabled={isVoting}
                        className="w-full py-3 px-4 border border-[#2B2B2B] text-[10px] font-bold uppercase tracking-widest hover:bg-[#E85C4A] hover:text-[#F5EFE6] transition-all disabled:opacity-50 flex justify-between items-center group"
                      >
                        <span>{SCALE_LABELS[val]}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity italic">Score 0{val-1}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleVote(1)}
                      disabled={isVoting}
                      className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest hover:text-[#E85C4A] transition-colors"
                    >
                      {DIDNT_GET_IT_LABEL}
                    </button>
                    <button 
                      onClick={handleUndo} 
                      disabled={isVoting || voteHistory.length === 0} 
                      className="inline-flex items-center gap-2 text-[10px] font-bold text-[#2B2B2B] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <FiRotateCcw className="w-3 h-3" /> Undo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-[#FAF7F2] border border-[#2B2B2B] rounded-sm w-full p-10 space-y-6">
            <h2 className="text-4xl font-black text-[#2B2B2B] italic">End of Feed</h2>
            <p className="text-[#8C8C8C] font-medium tracking-wide">You have reviewed all available entries in the current volume.</p>
            <Link 
              href="/captions" 
              className="inline-block px-8 py-4 bg-[#2B2B2B] text-[#F5EFE6] text-xs font-bold tracking-widest uppercase hover:bg-[#E85C4A] transition-all"
            >
              Return to Gallery
            </Link>
          </div>
        )}
      </div>
    );
  }

  // --- EDITORIAL GALLERY UI ---
  return (
    <div className="space-y-16">
      {!user && (
        <div className="border-y border-[#2B2B2B] py-16 text-center space-y-6">
          <h2 className="text-5xl font-black text-[#2B2B2B] italic tracking-tighter">JOIN THE CONSENSUS</h2>
          <p className="text-[#8C8C8C] max-w-lg mx-auto font-medium tracking-wide uppercase text-xs">Sign in to contribute rankings and access the editorial dashboard.</p>
          <Link 
            href="/auth/login" 
            className="inline-block px-12 py-5 bg-[#E85C4A] text-[#F5EFE6] text-xs font-bold tracking-widest uppercase hover:bg-[#2B2B2B] transition-all"
          >
            Start Voting
          </Link>
        </div>
      )}

      {user && mode === 'gallery' && (
        <div className="border border-[#2B2B2B] bg-[#FAF7F2] p-10 flex flex-col md:flex-row items-center justify-between gap-8 rounded-sm">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#E85C4A] tracking-widest uppercase">Action Required</span>
            <h3 className="text-3xl font-black italic tracking-tight">VOTING ROUND OPEN</h3>
            <p className="text-[#8C8C8C] text-sm tracking-wide">Review the latest batch of community submissions.</p>
          </div>
          <Link 
            href="/captions/vote" 
            className="px-10 py-4 bg-[#2B2B2B] text-[#F5EFE6] text-xs font-bold tracking-widest uppercase hover:bg-[#E85C4A] transition-all"
          >
            Enter Feed
          </Link>
        </div>
      )}

      <div className="space-y-10">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-[#2B2B2B] uppercase tracking-[0.3em]">Volume 01</span>
          <div className="h-[1px] flex-1 bg-[#2B2B2B]"></div>
          <span className="text-[10px] font-black text-[#2B2B2B] uppercase tracking-[0.3em]">Latest Entries</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {captions.map((caption) => (
            <div 
              key={caption.id} 
              className="group flex flex-col bg-[#FAF7F2] border border-[#2B2B2B] rounded-sm transition-all duration-300 hover:bg-[#E8E2D9]"
            >
              <div className="w-full aspect-[4/5] overflow-hidden bg-[#E8E2D9] border-b border-[#2B2B2B]">
                {caption.images?.url && (
                  <img src={caption.images.url} alt="Submission" className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 transition-all duration-500" />
                )}
              </div>
              
              <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                <p className="text-xl font-bold text-[#2B2B2B] leading-tight italic">
                  "{caption.content}"
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-[#2B2B2B]/20">
                  <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">
                    {new Date(caption.created_datetime_utc).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#E85C4A]"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {captions.length === 0 && (
          <div className="text-center py-32 space-y-4 border border-[#2B2B2B] bg-[#FAF7F2] border-dashed">
            <p className="text-[#8C8C8C] font-bold uppercase tracking-[0.2em] text-xs">Archives Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
