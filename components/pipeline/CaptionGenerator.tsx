'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCaptionPipeline } from '@/hooks/use-caption-pipeline';
import { supabase } from '@/lib/supabase/client';
import { 
  FiUploadCloud, 
  FiLoader, 
  FiAlertCircle, 
  FiRefreshCw, 
  FiArrowLeft, 
  FiArrowRight, 
  FiGrid,
  FiCheckCircle,
  FiThumbsUp
} from 'react-icons/fi';

const SCALE_LABELS: Record<number, string> = {
  2: 'not funny at all',
  3: 'not very funny',
  4: 'meh',
  5: 'funny',
  6: 'very funny',
};

export default function CaptionGenerator() {
  const { status, progress, captions, error, startPipeline, reset } = useCaptionPipeline();
  const [preview, setPreview] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      startPipeline(file);
    }
  };

  const handleVote = async (val: number) => {
    if (!user || status !== 'success') return;
    const captionId = captions[activeResultIndex]?.id;
    if (!captionId) return;

    const { error } = await supabase
      .from('caption_votes')
      .upsert(
        { 
          caption_id: captionId, 
          profile_id: user.id, 
          vote_value: val, 
          created_datetime_utc: new Date().toISOString(), 
          modified_datetime_utc: new Date().toISOString()
        },
        { onConflict: 'caption_id,profile_id' }
      );

    if (!error) {
      setVotedIds(prev => new Set(prev).add(captionId));
    } else {
      alert(`Vote failed: ${error.message}`);
    }
  };

  const nextResult = () => {
    setActiveResultIndex((prev) => (prev + 1) % captions.length);
  };

  const prevResult = () => {
    setActiveResultIndex((prev) => (prev - 1 + captions.length) % captions.length);
  };

  const hasVotedCurrent = captions[activeResultIndex] ? votedIds.has(captions[activeResultIndex].id) : false;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {status === 'idle' && (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800">
          <label className="flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[2rem] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FiUploadCloud className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-xl font-black text-gray-900 dark:text-white mb-2">Drop your image here</p>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">or click to browse</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>
      )}

      {(status !== 'idle' && status !== 'success') && (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 space-y-8">
          {preview && (
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800">
              <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-60 grayscale-[0.5]" />
              <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-black text-blue-600 uppercase tracking-widest mb-1">{status}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-none">AI is working...</h3>
              </div>
              <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-4 p-1 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500 shadow-lg shadow-blue-500/50" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
          {status === 'error' && (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-3xl flex items-center gap-4 border border-red-100 dark:border-red-900/30">
              <FiAlertCircle className="w-6 h-6 flex-shrink-0" />
              <span className="font-bold">{error}</span>
              <button onClick={reset} className="ml-auto px-4 py-2 bg-white dark:bg-gray-900 rounded-xl text-sm font-black shadow-sm">Retry</button>
            </div>
          )}
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-700">
          {/* Result Card Slider */}
          <div className="relative group max-w-xl mx-auto">
            <div className="absolute -inset-4 bg-blue-600/5 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
              {/* Image Section */}
              <div className="relative aspect-[16/10] md:aspect-video w-full bg-gray-100 dark:bg-gray-800">
                <img 
                  src={preview || ''} 
                  alt="Result" 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Caption Section */}
              <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-50 dark:border-gray-800/50">
                <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                      AI Variant {activeResultIndex + 1}
                    </span>
                    {hasVotedCurrent && (
                      <span className="flex items-center gap-1.5 text-green-500 font-black text-[10px] uppercase tracking-widest">
                        <FiCheckCircle className="w-3 h-3" /> Ranked
                      </span>
                    )}
                  </div>
                  <p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                    "{captions[activeResultIndex]?.content}"
                  </p>

                  {/* Immediate Voting Buttons */}
                  {!hasVotedCurrent && (
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-1.5">
                        {[2, 3, 4, 5, 6].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleVote(val)}
                            className="flex-1 py-3 px-1 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-blue-500 transition-all text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter"
                          >
                            {SCALE_LABELS[val]}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleVote(1)}
                        className="w-full py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest border border-transparent hover:border-gray-200"
                      >
                        didnt get it
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-2">
                  <button onClick={prevResult} className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95">
                    <FiArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextResult} className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95">
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  {captions.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === activeResultIndex ? "w-6 bg-blue-600" : "w-1.5 bg-gray-300 dark:bg-gray-700"
                      )} 
                    />
                  ))}
                </div>

                <button onClick={reset} className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-black text-xs border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                  <FiRefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3">
            <Link 
              href="/captions/vote" 
              className="w-full md:w-auto px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-[1.5rem] font-black transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
            >
              <FiThumbsUp className="w-4 h-4" /> Rank Community Pool
            </Link>
            <Link 
              href="/captions" 
              className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black transition-all shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
            >
              <FiGrid className="w-4 h-4" /> View in Public Gallery
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
