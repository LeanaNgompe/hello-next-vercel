'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCaptionPipeline } from '@/hooks/use-caption-pipeline';
import { supabase } from '@/lib/supabase/client';
import { 
  FiUploadCloud, 
  FiLoader, 
  FiAlertCircle, 
  FiArrowLeft, 
  FiArrowRight, 
  FiCheckCircle,
} from 'react-icons/fi';

const SCALE_LABELS: Record<number, string> = {
  2: 'not funny at all',
  3: 'not very funny',
  4: 'meh',
  5: 'funny',
  6: 'very funny',
};

export default function CaptionGenerator() {
  const [mounted, setMounted] = useState(false);
  const { status, progress, captions, error, startPipeline, reset } = useCaptionPipeline();
  const [preview, setPreview] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
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
    const captionId = Array.isArray(captions) ? captions[activeResultIndex]?.id : null;
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
      setVotedIds(prev => {
        const next = new Set(prev);
        next.add(captionId);
        return next;
      });
    } else {
      alert(`Vote failed: ${error.message}`);
    }
  };

  const nextResult = () => {
    if (!Array.isArray(captions) || captions.length === 0) return;
    setActiveResultIndex((prev) => (prev + 1) % captions.length);
  };

  const prevResult = () => {
    if (!Array.isArray(captions) || captions.length === 0) return;
    setActiveResultIndex((prev) => (prev - 1 + captions.length) % captions.length);
  };

  const hasVotedCurrent = (Array.isArray(captions) && captions[activeResultIndex]) 
    ? votedIds.has(captions[activeResultIndex].id) 
    : false;

  // Hydration safety: Return empty or skeletal state during server render
  if (!mounted) {
    return <div className="w-full max-w-2xl mx-auto h-80 bg-[#FAF7F2]/50 animate-pulse rounded-sm border border-[#2B2B2B]/10" />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-10">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black italic tracking-tight text-[#2B2B2B]">CAPTION ENGINE</h2>
        <p className="text-[#8C8C8C] text-xs font-bold uppercase tracking-[0.2em]">Volume 01 / AI Pipeline</p>
      </div>

      {status === 'idle' && (
        <div className="bg-[#FAF7F2] p-10 border border-[#2B2B2B] rounded-sm">
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-[#2B2B2B]/20 rounded-sm cursor-pointer hover:bg-[#E822D9]/5 transition-all group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FiUploadCloud className="w-12 h-12 text-[#2B2B2B] mb-4 opacity-20 group-hover:opacity-100 transition-opacity" />
              <p className="text-sm font-bold text-[#2B2B2B] uppercase tracking-widest mb-2">Drop Image Asset</p>
              <p className="text-[10px] text-[#8C8C8C] font-bold uppercase tracking-[0.2em]">Source file required</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>
      )}

      {(status !== 'idle' && status !== 'success') && (
        <div className="bg-[#FAF7F2] p-10 border border-[#2B2B2B] rounded-sm space-y-8">
          <div className="relative aspect-video w-full border border-[#2B2B2B] rounded-sm overflow-hidden grayscale">
            {preview && <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-40" />}
            <div className="absolute inset-0 flex items-center justify-center">
              <FiLoader className="w-8 h-8 text-[#2B2B2B] animate-spin" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-[#2B2B2B] uppercase tracking-widest">{String(status)}</span>
              <span className="text-2xl font-black text-[#2B2B2B]">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-[#E8E2D9]">
              <div className="h-full bg-[#2B2B2B] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {status === 'error' && (
            <div className="p-4 bg-[#E85C4A]/10 text-[#E85C4A] border border-[#E85C4A] text-xs font-bold uppercase tracking-widest flex items-center gap-3">
              <FiAlertCircle /> 
              <span>{typeof error === 'string' ? error : 'Generation failed. Please try again.'}</span>
              <button onClick={reset} className="ml-auto underline">Retry</button>
            </div>
          )}
        </div>
      )}

      {status === 'success' && Array.isArray(captions) && captions.length > 0 && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="relative bg-[#FAF7F2] border border-[#2B2B2B] rounded-sm overflow-hidden flex flex-col">
            <div className="relative aspect-[16/10] md:aspect-video w-full bg-[#E8E2D9]">
              <img src={preview || ''} alt="Result" className="w-full h-full object-cover grayscale-[0.2]" />
            </div>

            <div className="p-10 border-t border-[#2B2B2B] bg-[#FAF7F2] space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#E85C4A] uppercase tracking-widest italic">
                    AI Variant 0{activeResultIndex + 1}
                  </span>
                  {hasVotedCurrent && (
                    <span className="text-[10px] font-bold text-[#2B2B2B] uppercase tracking-widest flex items-center gap-2">
                      <FiCheckCircle className="w-3 h-3 text-[#E85C4A]" /> Archive Entry Recorded
                    </span>
                  )}
                </div>
                <p className="text-3xl font-black text-[#2B2B2B] leading-tight italic">
                  "{typeof captions[activeResultIndex]?.content === 'string' 
                    ? captions[activeResultIndex].content 
                    : 'Caption data invalid'}"
                </p>

                {!hasVotedCurrent && (
                  <div className="pt-8 border-t border-[#2B2B2B]/10 space-y-4">
                    <span className="text-[10px] font-bold text-[#2B2B2B] tracking-widest uppercase">Editorial Review</span>
                    <div className="grid grid-cols-1 gap-2">
                      {[2, 3, 4, 5, 6].map((val) => (
                        <button
                          key={val}
                          onClick={() => handleVote(val)}
                          className="w-full py-2.5 px-4 border border-[#2B2B2B] text-[10px] font-bold uppercase tracking-widest hover:bg-[#E85C4A] hover:text-[#F5EFE6] transition-all flex justify-between items-center group"
                        >
                          <span>{SCALE_LABELS[val]}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity italic">Rank 0{val-1}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-[#2B2B2B] bg-[#E8E2D9]/30">
              <div className="flex gap-2">
                <button onClick={prevResult} className="w-10 h-10 border border-[#2B2B2B] flex items-center justify-center hover:bg-[#2B2B2B] hover:text-[#F5EFE6] transition-all">
                  <FiArrowLeft />
                </button>
                <button onClick={nextResult} className="w-10 h-10 border border-[#2B2B2B] flex items-center justify-center hover:bg-[#2B2B2B] hover:text-[#F5EFE6] transition-all">
                  <FiArrowRight />
                </button>
              </div>
              <button onClick={reset} className="px-6 py-2 border border-[#2B2B2B] text-[10px] font-bold uppercase tracking-widest hover:bg-[#2B2B2B] hover:text-[#F5EFE6] transition-all">
                Restart Pipeline
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link 
              href="/captions/vote" 
              className="w-full md:w-auto px-10 py-4 bg-[#2B2B2B] text-[#F5EFE6] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#E85C4A] transition-all text-center"
            >
              Enter Global Feed
            </Link>
            <Link 
              href="/captions" 
              className="w-full md:w-auto px-10 py-4 border border-[#2B2B2B] text-[#2B2B2B] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#2B2B2B] hover:text-[#F5EFE6] transition-all text-center"
            >
              Public Archives
            </Link>
          </div>
        </div>
      )}

      {status === 'success' && (!Array.isArray(captions) || captions.length === 0) && (
        <div className="p-10 bg-[#FAF7F2] border border-[#2B2B2B] rounded-sm text-center space-y-4">
          <p className="text-sm font-bold text-[#2B2B2B] uppercase tracking-widest">No Captions Generated</p>
          <button onClick={reset} className="underline text-[10px] font-bold uppercase tracking-widest">Try another image</button>
        </div>
      )}
    </div>
  );
}
