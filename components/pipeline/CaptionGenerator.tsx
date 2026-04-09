'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCaptionPipeline } from '@/hooks/use-caption-pipeline';
import { FiUploadCloud, FiLoader, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

export default function CaptionGenerator() {
  const { status, progress, captions, error, startPipeline, reset } = useCaptionPipeline();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      startPipeline(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
      {status === 'idle' && (
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <FiUploadCloud className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-bold text-gray-600 dark:text-gray-300">Click to upload image</p>
            <p className="text-sm text-gray-400">PNG, JPG, WEBP, GIF or HEIC</p>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      )}

      {(status !== 'idle' && status !== 'success') && (
        <div className="space-y-6">
          {preview && (
            <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl opacity-50" />
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold uppercase tracking-widest text-gray-500">
              <span className="flex items-center gap-2">
                <FiLoader className="animate-spin" /> {status}...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
          {status === 'error' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center gap-3">
              <FiAlertCircle /> <span className="font-medium">{error}</span>
              <button onClick={reset} className="ml-auto underline">Retry</button>
            </div>
          )}
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FiCheckCircle className="text-green-500" /> Pipeline Complete
            </h3>
            <button onClick={reset} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
              <FiRefreshCw /> Start Over
            </button>
          </div>

          <div className="columns-1 md:columns-2 gap-6 space-y-6">
            {/* Image Preview Card */}
            {preview && (
              <div className="break-inside-avoid bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                <img src={preview} alt="Generated for" className="w-full object-cover" />
                <div className="p-4 bg-white dark:bg-gray-900">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Source Image</p>
                </div>
              </div>
            )}

            {/* Generated Captions */}
            {captions.map((cap, i) => (
              <div 
                key={i} 
                className="break-inside-avoid p-6 bg-white dark:bg-gray-950 rounded-2xl border-2 border-transparent hover:border-blue-500 transition-all shadow-md hover:shadow-xl group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                    AI Variant {i + 1}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
                  "{cap.content}"
                </p>
              </div>
            ))}
          </div>

          <div className="pt-6 flex justify-center">
            <Link 
              href="/captions" 
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              View in Public Gallery
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
