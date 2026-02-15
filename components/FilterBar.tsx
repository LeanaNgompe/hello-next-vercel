'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client'; // Corrected import

interface Tag {
  id: number;
  name: string;
}

export default function FilterBar({ tags }: { tags: Tag[] }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-semibold mb-2">Filter by Tags:</h3>

      {tags.length === 0 ? (
        <p className="text-sm text-gray-500">No tags available</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm bg-gray-200 hover:bg-gray-300 transition"
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}