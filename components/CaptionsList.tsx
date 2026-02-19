'use client';

import { useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';
import { FiRotateCcw, FiHeart, FiX, FiLock } from 'react-icons/fi';
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
  likes: number;
  dislikes: number;
  user_vote: number;
}

export default function CaptionsList({ initialCaptions, user }: { initialCaptions: Caption[], user: any }) {
  // Only allow voting on captions that have an image
  const votableCaptions = useMemo(() => initialCaptions.filter(c => c.images?.url), [initialCaptions]);
  
  const [captions, setCaptions] = useState<Caption[]>(votableCaptions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [voteHistory, setVoteHistory] = useState<{ captionId: string, vote: number }[]>([]);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
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
    
    // Persist to Supabase first
    const { error } = await supabase
      .from('caption_votes')
      .upsert(
        { caption_id: captionId, profile_id: user.id, vote_value: newValue, created_datetime_utc: new Date().toISOString(), modified_datetime_utc: new Date().toISOString()},
        { onConflict: 'caption_id,profile_id' }
      );

    if (error) {
      console.error('Voting failed:', error.message);
      alert(`Could not save vote: ${error.message}`);
      return;
    }
    const { data, error: checkError } = await supabase
    .from('caption_votes')
    .select('*')
    .eq('profile_id', user.id)
    .eq('caption_id', captionId);

    if (checkError) {
      console.error('Vote check failed:', checkError);
    } else {
      console.log('Vote check:', data);
    }
    // Store in history for undo functionality
    setVoteHistory(prev => [...prev, { captionId, vote: newValue }]);

    // If successful, proceed with animation
    const direction = newValue === 1 ? 'right' : 'left';
    setExitDirection(direction);
    setIsAnimating(true);

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setExitDirection(null);
      setIsAnimating(false);
      setDragOffset({ x: 0, y: 0 });
    }, 500);
  };

  /** Reverses the last action and moves the UI back to show the previous vote */
  const handleUndo = async () => {
    if (!user || isAnimating || voteHistory.length === 0) return;

    const lastVote = voteHistory[voteHistory.length - 1];
    
    // Move the index back first so the previous card is rendered
    setCurrentIndex(prev => prev - 1);
    setVoteHistory(prev => prev.slice(0, -1));
    
    // Visual feedback: Show the card offset in the direction of the previous vote
    // so the user "sees" what they voted for (Like or Nope indicator will appear)
    setDragOffset({ x: lastVote.vote === 1 ? 120 : -120, y: 0 });
    setIsAnimating(true);

    // Smoothly animate the card back to the center position
    setTimeout(() => {
      setDragOffset({ x: 0, y: 0 });
      // Allow interaction again after the return animation finishes
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
    const threshold = 120;
    if (dragOffset.x > threshold) handleVote(1);
    else if (dragOffset.x < -threshold) handleVote(-1);
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
          <div className="relative w-full max-w-sm h-[550px] perspective-1000">
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
              {/* Image Section - Takes 65% of the card height */}
              <div className="relative h-[65%] w-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
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
                    <span className="text-orange-500 text-3xl font-black uppercase">Like</span>
                  </div>
                )}
                {dragOffset.x < -50 && (
                  <div className="absolute top-10 right-10 border-4 border-blue-500 rounded-lg px-4 py-2 rotate-[15deg] opacity-80 pointer-events-none z-10 bg-white/10 backdrop-blur-sm">
                    <span className="text-blue-500 text-3xl font-black uppercase">Nope</span>
                  </div>
                )}
              </div>

              {/* Content Section - Takes 35% of the card height */}
              <div className="flex-1 p-6 bg-white dark:bg-gray-900 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-xl font-bold leading-tight text-gray-800 dark:text-gray-100">
                    {currentCaption.content || 'Untitled'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-widest pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                  <span>{new Date(currentCaption.created_datetime_utc).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-orange-500">
                      <FiHeart className="fill-current w-3 h-3" /> {currentCaption.likes}
                    </span>
                    <span className="flex items-center gap-1 text-blue-500">
                      <FiX className="w-3 h-3 stroke-[3]" /> {currentCaption.dislikes}
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

        {/* Action Buttons - Perfectly centered below the card */}
        {!isLastCard && (
          <div className="flex items-center justify-center gap-8 mt-12 w-full">
            <button 
              onClick={handleUndo} 
              disabled={isAnimating || voteHistory.length === 0} 
              className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center justify-center disabled:opacity-30 disabled:hover:scale-100"
              aria-label="Undo"
            >
              <FiRotateCcw className="w-5 h-5 stroke-[3]" />
            </button>
            <button 
              onClick={() => handleVote(-1)} 
              disabled={isAnimating} 
              className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center"
              aria-label="Dislike"
            >
              <FiX className="w-8 h-8 stroke-[3]" />
            </button>
            <button 
              onClick={() => handleVote(1)} 
              disabled={isAnimating} 
              className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-center"
              aria-label="Like"
            >
              <FiHeart className="w-8 h-8 fill-current stroke-[3]" />
            </button>
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
      <div className="grid gap-6">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Featured Captions</h3>
        {captions.slice(0, 10).map((caption) => (
          <div 
            key={caption.id} 
            className="group flex flex-col md:flex-row items-center gap-6 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
          >
            <div className="w-full md:w-36 h-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              <img 
                src={caption.images?.url} 
                alt="Caption context" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              />
            </div>
            
            <div className="flex-1 space-y-3 w-full">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-tight">
                {caption.content}
              </p>
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>
                <div className="flex items-center gap-3 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-full">
                  <span className="flex items-center gap-1 text-orange-500">
                    <FiHeart className="fill-current w-3 h-3" /> {caption.likes}
                  </span>
                  <span className="flex items-center gap-1 text-blue-500">
                    <FiX className="w-3 h-3 stroke-[3]" /> {caption.dislikes}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {captions.length === 0 && (
          <p className="text-center text-gray-500 py-10">No captions with images available yet.</p>
        )}
      </div>
    </div>
  );
}
