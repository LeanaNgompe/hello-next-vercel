'use client';

import { useState, useRef } from 'react';
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
  like_count: number;
  user_vote: number;
}

export default function CaptionsList({ initialCaptions, user }: { initialCaptions: Caption[], user: any }) {
  const [captions, setCaptions] = useState<Caption[]>(initialCaptions);
  const [currentIndex, setCurrentIndex] = useState(0);
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
    if (!user) return; // Should not be reachable for guests
    if (isAnimating || isLastCard) return;

    const captionId = currentCaption.id;
    const direction = newValue === 1 ? 'right' : 'left';
    
    setExitDirection(direction);
    setIsAnimating(true);

    try {
      await supabase
        .from('caption_votes')
        .upsert(
          { caption_id: captionId, profile_id: user.id, vote_value: newValue },
          { onConflict: 'caption_id,profile_id' }
        );
    } catch (err) {
      console.error('Voting failed:', err);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setExitDirection(null);
      setIsAnimating(false);
      setDragOffset({ x: 0, y: 0 });
    }, 500);
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
              <div className="relative flex-1 bg-gray-100 dark:bg-gray-800">
                {currentCaption.images?.url ? (
                  <img src={currentCaption.images.url} alt="Context" className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 font-medium">No Image</div>
                )}
                {dragOffset.x > 50 && (
                  <div className="absolute top-10 left-10 border-4 border-orange-500 rounded-lg px-4 py-2 rotate-[-15deg] opacity-80 pointer-events-none">
                    <span className="text-orange-500 text-3xl font-black uppercase">Like</span>
                  </div>
                )}
                {dragOffset.x < -50 && (
                  <div className="absolute top-10 right-10 border-4 border-blue-500 rounded-lg px-4 py-2 rotate-[15deg] opacity-80 pointer-events-none">
                    <span className="text-blue-500 text-3xl font-black uppercase">Nope</span>
                  </div>
                )}
              </div>
              <div className="p-6 bg-white dark:bg-gray-900 space-y-3">
                <p className="text-xl font-bold leading-tight text-gray-800 dark:text-gray-100 line-clamp-3">{currentCaption.content || 'Untitled'}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-widest">
                  <span>{new Date(currentCaption.created_datetime_utc).toLocaleDateString()}</span>
                  <span>Votes: {currentCaption.like_count}</span>
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

        {!isLastCard && (
          <div className="flex items-center gap-8 mt-12">
            <button onClick={() => handleVote(-1)} disabled={isAnimating} className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-blue-500 hover:bg-blue-50">
              <FiX className="w-8 h-8 stroke-[3]" />
            </button>
            <button onClick={() => handleVote(1)} disabled={isAnimating} className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95 transition-all text-orange-500 hover:bg-orange-50">
              <FiHeart className="w-8 h-8 fill-current stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- RENDERING FOR GUESTS (LIST VIEW) ---
  return (
    <div className="space-y-12">
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

      {/* Preview List */}
      <div className="grid gap-6">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Recent Captions</h3>
        {captions.slice(0, 10).map((caption) => (
          <div 
            key={caption.id} 
            className="group flex flex-col md:flex-row items-center gap-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all"
          >
            <div className="w-full md:w-32 h-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
              {caption.images?.url ? (
                <img src={caption.images.url} alt="Caption context" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No Image</div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-tight">
                {caption.content}
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                <span>{new Date(caption.created_datetime_utc).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  <span className="text-orange-500">★</span> {caption.like_count} votes
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
