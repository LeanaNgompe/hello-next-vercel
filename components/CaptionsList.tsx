'use client';

import { useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';
import { FiRotateCcw, FiStar, FiLock, FiMessageSquare } from 'react-icons/fi';
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
  1: 'didnt get it',
  2: 'not funny at all',
  3: 'not very funny',
  4: 'meh',
  5: 'funny',
  6: 'very funny',
};

export default function CaptionsList({ initialCaptions, user }: { initialCaptions: Caption[], user: any }) {
  // Only allow voting on captions that have an image
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
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sliderValue, setSliderValue] = useState(3);
  
  // Swipe State
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const currentCaption = captions[currentIndex];
  const isLastCard = currentIndex >= captions.length;

  /** Handles the vote logic and triggers the animation */
  const handleVote = async (newValue: number) => {
    if (!user) return; 
    if (isAnimating || isLastCard) return;

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
      // Revert local state on error
      setCaptions(prev => prev.map(c => c.id === captionId ? { ...c, user_vote: currentCaption.user_vote } : c));
      alert(`Could not save vote: ${error.message}`);
      return;
    }

    // Store in history for undo functionality
    setVoteHistory(prev => [...prev, { captionId, vote: newValue }]);

    // Proceed with animation
    const direction = newValue >= 5 ? 'right' : newValue <= 3 ? 'left' : 'right'; // Animation direction
    setExitDirection(direction);
    setIsAnimating(true);

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setExitDirection(null);
      setIsAnimating(false);
      setDragOffset({ x: 0, y: 0 });
      setSliderValue(3); // Reset slider for next card
    }, 500);
  };

  /** Reverses the last action and moves the UI back to show the previous vote */
  const handleUndo = async () => {
    if (!user || isAnimating || voteHistory.length === 0) return;

    const lastVote = voteHistory[voteHistory.length - 1];
    const prevIndex = currentIndex - 1;
    const captionToUndo = captions[prevIndex];

    // 1. Revert in Database (Delete the vote)
    const { error } = await supabase
      .from('caption_votes')
      .delete()
      .eq('caption_id', captionToUndo.id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Undo failed:', error.message);
      alert('Failed to undo vote in database.');
      return;
    }

    // 2. Update local state
    setCaptions(prev => prev.map(c => {
      if (c.id === captionToUndo.id) {
        return { ...c, user_vote: 0 };
      }
      return c;
    }));
    
    // 3. Move the index back
    setCurrentIndex(prevIndex);
    setVoteHistory(prev => prev.slice(0, -1));
    
    // 4. Visual feedback animation
    setDragOffset({ x: lastVote.vote >= 5 ? 120 : -120, y: 0 });
    setIsAnimating(true);

    setTimeout(() => {
      setDragOffset({ x: 0, y: 0 });
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }, 800);
  };

  /** Drag/Swipe Event Handlers */
  const onDragStart = (x: number, y: number) => {
    if (isAnimating || isLastCard || !user) return;
    setDragStart({ x, y });
  };

  const onDragMove = (x: number, y: number) => {
    if (!dragStart || isAnimating || isLastCard) return;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    setDragOffset({ x: dx, y: dy });
  };

  const onDragEnd = () => {
    if (!dragStart || isAnimating || isLastCard) return;
    const threshold = 150;
    if (dragOffset.x > threshold) handleVote(6); // Swipe right for "Very funny"
    else if (dragOffset.x < -threshold) handleVote(1); // Swipe left for "Not funny at all"
    else setDragOffset({ x: 0, y: 0 });
    setDragStart(null);
  };

  const getCardStyle = () => {
    if (exitDirection === 'right') return { transform: 'translateX(150%) rotate(30deg)', opacity: 0, transition: 'all 0.5s ease-out' };
    if (exitDirection === 'left') return { transform: 'translateX(-150%) rotate(-30deg)', opacity: 0, transition: 'all 0.5s ease-out' };
    if (dragStart) {
      const rotate = dragOffset.x * 0.1;
      return { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotate}deg)`, transition: 'none' };
    }
    return { transform: 'translate(0,0) rotate(0)', transition: 'all 0.3s ease-out' };
  };

  // --- RENDERING FOR LOGGED IN USERS (TINDER UI) ---
  if (user) {
    return (
      <div className="flex flex-col items-center justify-center py-10 min-h-[70vh]">
        {!isLastCard ? (
          <div className="relative w-full max-w-sm h-[500px] perspective-1000">
            {currentIndex + 1 < captions.length && (
              <div className="absolute inset-0 scale-95 translate-y-4 opacity-50 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 -z-10" />
            )}

            <div
              ref={cardRef}
              style={getCardStyle()}
              onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
              onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
              onMouseUp={onDragEnd}
              onMouseLeave={onDragEnd}
              onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={onDragEnd}
              className={cn(
                "absolute inset-0 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden cursor-grab active:cursor-grabbing select-none flex flex-col",
                dragOffset.x > 50 && "border-orange-500/50",
                dragOffset.x < -50 && "border-blue-500/50"
              )}
            >
              {/* Image Section - Takes 60% of the card height */}
              <div className="relative h-[60%] w-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {currentCaption.images?.url && (
                  <img 
                    src={currentCaption.images.url} 
                    alt="Context" 
                    className="w-full h-full object-cover pointer-events-none" 
                  />
                )}
                
                {/* Swipe Indicators */}
                {dragOffset.x > 50 && (
                  <div className="absolute top-10 left-10 border-4 border-orange-500 rounded-lg px-4 py-2 rotate-[-15deg] opacity-80 pointer-events-none z-10 bg-white/10 backdrop-blur-sm">
                    <span className="text-orange-500 text-3xl font-black uppercase">Funny</span>
                  </div>
                )}
                {dragOffset.x < -50 && (
                  <div className="absolute top-10 right-10 border-4 border-blue-500 rounded-lg px-4 py-2 rotate-[15deg] opacity-80 pointer-events-none z-10 bg-white/10 backdrop-blur-sm">
                    <span className="text-blue-500 text-3xl font-black uppercase">Meh</span>
                  </div>
                )}
              </div>

              {/* Content Section - Takes 40% of the card height */}
              <div className="flex-1 p-6 bg-white dark:bg-gray-900 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-xl font-bold leading-tight text-gray-800 dark:text-gray-100">
                    {currentCaption.content || 'Untitled'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-widest pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                  <span>{new Date(currentCaption.created_datetime_utc).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-orange-500 font-black">
                      <FiStar className="fill-current w-3 h-3" />
                      <span>{currentCaption.avg_score}</span>
                    </span>
                    <span className="flex items-center gap-1 text-blue-500 font-black">
                      <FiMessageSquare className="w-3 h-3" />
                      <span>{currentCaption.vote_count}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 w-full max-w-sm px-6">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">You've seen them all!</h2>
            <button onClick={() => setCurrentIndex(0)} className="flex items-center justify-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-all shadow-lg hover:shadow-blue-500/25">
              <FiRotateCcw /> Rewatch
            </button>
          </div>
        )}

        {/* Voting Slider - Perfectly centered below the card */}
        {!isLastCard && (
          <div className="mt-8 w-full max-w-sm px-4 space-y-6">
            <div className="text-center">
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 transition-all duration-200">
                {SCALE_LABELS[sliderValue]}
              </p>
            </div>
            
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={sliderValue}
              onChange={(e) => setSliderValue(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            
            <div className="flex justify-between px-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
              <span>Not funny</span>
              <span>Funny!</span>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4">
              <button 
                onClick={handleUndo} 
                disabled={isAnimating || voteHistory.length === 0} 
                className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center justify-center disabled:opacity-30 disabled:hover:scale-100"
                aria-label="Undo"
              >
                <FiRotateCcw className="w-5 h-5 stroke-[3]" />
              </button>
              
              <button 
                onClick={() => handleVote(sliderValue)} 
                disabled={isAnimating} 
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                Submit Vote
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDERING FOR GUESTS (LIST VIEW) ---
  return (
    <div className="space-y-12 max-w-2xl mx-auto">
      {/* Login Prompt CTA */}
      <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-500/20">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-2xl font-black flex items-center justify-center md:justify-start gap-2">
            <FiLock className="w-6 h-6" /> Join the Community
          </h2>
          <p className="text-blue-100 font-medium">Log in to start voting and unlock the discovery experience.</p>
        </div>
        <Link 
          href="/auth/login" 
          className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-black hover:bg-gray-100 transition-all shadow-lg shadow-black/10 flex-shrink-0"
        >
          Log In to Vote
        </Link>
      </div>

      {/* Preview List (Only showing captions with images for consistency) */}
      <div className="space-y-6">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Featured Captions</h3>
        <div className="columns-2 md:columns-3 gap-6 space-y-6">
          {captions.map((caption) => (
            <div 
              key={caption.id} 
              className="break-inside-avoid group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              <div className="w-full aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img 
                  src={caption.images?.url} 
                  alt="Caption context" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                />
              </div>
              
              <div className="p-4 space-y-3">
                <p className="text-base font-bold text-gray-800 dark:text-gray-200 leading-tight">
                  {caption.content}
                </p>
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                  <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-orange-500">
                      <FiStar className="fill-current w-2.5 h-2.5" /> {caption.avg_score}
                    </span>
                    <span className="flex items-center gap-1 text-blue-500">
                      <FiMessageSquare className="w-2.5 h-2.5" /> {caption.vote_count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {captions.length === 0 && (
          <p className="text-center text-gray-500 py-10">No captions with images available yet.</p>
        )}
      </div>
    </div>
  );
}
