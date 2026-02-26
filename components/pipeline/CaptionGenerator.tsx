'use client';

import React, { useState } from 'react';
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FiCheckCircle className="text-green-500" /> Generated Captions
            </h3>
            <button onClick={reset} className="flex items-center gap-2 text-sm font-bold text-blue-600">
              <FiRefreshCw /> New Image
            </button>
          </div>
          <div className="grid gap-3">
            {captions.map((cap, i) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 transition-colors">
                <p className="text-gray-800 dark:text-gray-200 font-medium">{cap.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
