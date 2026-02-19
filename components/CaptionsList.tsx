'use client';

import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  user_vote: number; // Local tracking of the current user's vote
}

export default function CaptionsList({ initialCaptions, user }: { initialCaptions: Caption[], user: any }) {
  const [captions, setCaptions] = useState<Caption[]>(initialCaptions);
  const [sortType, setSortType] = useState('date');

  /**
   * Handles upvote/downvote with optimistic UI updates.
   * newValue: 1 for upvote, -1 for downvote.
   */
  const handleVote = async (captionId: string, newValue: number) => {
    if (!user) {
      alert('Please log in to cast your vote!');
      return;
    }

    const captionIndex = captions.findIndex(c => c.id === captionId);
    if (captionIndex === -1) return;

    const currentCaption = captions[captionIndex];
    const oldVote = currentCaption.user_vote;
    
    // Toggle Logic: If user clicks the same button, it "undos" the vote (sets to 0)
    const finalVoteValue = oldVote === newValue ? 0 : newValue;
    const voteDifference = finalVoteValue - oldVote;

    // --- STEP 1: Optimistic UI Update ---
    const updatedCaptions = [...captions];
    updatedCaptions[captionIndex] = {
      ...currentCaption,
      user_vote: finalVoteValue,
      like_count: currentCaption.like_count + voteDifference
    };
    setCaptions(updatedCaptions);

    try {
      // --- STEP 2: Supabase Persistence ---
      if (finalVoteValue === 0) {
        // Remove vote record from database
        const { error } = await supabase
          .from('caption_votes')
          .delete()
          .match({ caption_id: captionId, profile_id: user.id });
        
        if (error) throw error;
      } else {
        // Upsert vote record (Insert or Update on conflict)
        const { error } = await supabase
          .from('caption_votes')
          .upsert(
            { 
              caption_id: captionId, 
              profile_id: user.id, 
              vote_value: finalVoteValue 
            },
            { onConflict: 'caption_id,profile_id' }
          );
        
        if (error) throw error;
      }
    } catch (err) {
      console.error('Voting failed:', err);
      // --- STEP 3: Revert on Failure ---
      setCaptions(captions);
      alert('We couldn\'t save your vote. Please try again.');
    }
  };

  /** Sorting Logic */
  const sortedCaptions = useMemo(() => {
    return [...captions].sort((a, b) => {
      if (sortType === 'popularity') return b.like_count - a.like_count;
      if (sortType === 'alphabetical') return (a.content || '').localeCompare(b.content || '');
      return new Date(b.created_datetime_utc).getTime() - new Date(a.created_datetime_utc).getTime();
    });
  }, [captions, sortType]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex justify-end items-center mb-8">
        <select 
          onChange={(e) => setSortType(e.target.value)}
          value={sortType}
          className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
        >
          <option value="date">Newest</option>
          <option value="popularity">Most Liked</option>
          <option value="alphabetical">A-Z</option>
        </select>
      </div>

      {/* Caption Cards */}
      <div className="grid gap-6">
        {sortedCaptions.map((caption) => (
          <div 
            key={caption.id} 
            className="group flex flex-col md:flex-row items-center gap-6 p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-blue-500/20 dark:hover:border-blue-500/20 shadow-sm hover:shadow-2xl transition-all duration-500"
          >
            {/* Image Preview */}
            <div className="relative w-full md:w-56 h-48 md:h-36 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-inner">
              {caption.images?.url ? (
                <img
                  src={caption.images.url}
                  alt="Caption Context"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs italic">No Image</div>
              )}
            </div>
            
            {/* Content & Vote Controls */}
            <div className="flex-1 w-full flex flex-col justify-between">
              <div className="space-y-2">
                <p className="text-xl font-semibold leading-snug text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {caption.content || 'Untitled Caption'}
                </p>
                <time className="block text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                  {new Date(caption.created_datetime_utc).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </time>
              </div>

              <div className="flex items-center justify-between md:justify-start gap-6 mt-6">
                {/* Vote Widget */}
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleVote(caption.id, 1)}
                    disabled={!user}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-300",
                      caption.user_vote === 1 
                        ? "text-orange-500 bg-white dark:bg-gray-700 shadow-md scale-110" 
                        : "text-gray-400 hover:text-orange-500 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30"
                    )}
                    title="Upvote"
                  >
                    <FiArrowUp className="w-6 h-6 stroke-[3]" />
                  </button>
                  
                  <span className={cn(
                    "px-3 min-w-[3rem] text-center font-black text-lg transition-colors duration-300",
                    caption.like_count > 0 ? "text-orange-500" : caption.like_count < 0 ? "text-blue-500" : "text-gray-400"
                  )}>
                    {caption.like_count}
                  </span>

                  <button
                    onClick={() => handleVote(caption.id, -1)}
                    disabled={!user}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-300",
                      caption.user_vote === -1 
                        ? "text-blue-500 bg-white dark:bg-gray-700 shadow-md scale-110" 
                        : "text-gray-400 hover:text-blue-500 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30"
                    )}
                    title="Downvote"
                  >
                    <FiArrowDown className="w-6 h-6 stroke-[3]" />
                  </button>
                </div>

                {!user && (
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest opacity-60">
                    Sign in to vote
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {sortedCaptions.length === 0 && (
          <div className="text-center py-24 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
            <p className="text-gray-400 dark:text-gray-600 font-medium text-xl">No captions found. Be the first to add one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
