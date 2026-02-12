'use client';

import { useState } from 'react';

export default function CaptionsList({ initialCaptions }: { initialCaptions: any[] }) {
  const [sortType, setSortType] = useState('date');

  const sortedCaptions = [...initialCaptions].sort((a, b) => {
    switch (sortType) {
      case 'popularity':
        return (b.like_count || 0) - (a.like_count || 0);
      case 'alphabetical':
        return (a.content || '').localeCompare(b.content || '');
      case 'date':
      default:
        return new Date(b.created_datetime_utc).getTime() - new Date(a.created_datetime_utc).getTime();
    }
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Captions List</h1>
        <select 
          onChange={(e) => setSortType(e.target.value)}
          value={sortType}
          className="p-2 border border-gray-300 rounded-md bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <option value="date">Sort by: Date</option>
          <option value="popularity">Sort by: Popularity</option>
          <option value="alphabetical">Sort by: Alphabetical</option>
        </select>
      </div>

      <div className="space-y-4">
        {sortedCaptions.map((caption: any) => (
          caption.images && caption.images.url ? (
            <div key={caption.id} className="flex items-start p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              {/* Image */}
              <div className="flex flex-col items-center mr-6 flex-shrink-0">
                <img
                  src={caption.images.url}
                  alt={`Image for caption ${caption.id}`}
                  className="w-20 h-20 rounded-md object-cover"
                />
              </div>
              
              {/* Caption Text and Date */}
              <div className="flex-1 flex flex-col mr-6">
                <p className="text-gray-800 text-lg">
                  {caption.content || 'No content provided for this caption.'}
                </p>
                {caption.created_datetime_utc && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(caption.created_datetime_utc).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Number/Count */}
              <span className="text-gray-600 font-semibold text-xl ml-auto flex-shrink-0">
                {caption.like_count !== undefined ? caption.like_count : ''}
              </span>
            </div>
          ) : null
        ))}
      </div>
      {(!sortedCaptions || sortedCaptions.filter(c => c.images && c.images.url).length === 0) && (
        <p className="text-center text-gray-500 mt-10">No captions with images found.</p>
      )}
    </div>
  )
}