'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client'; // Corrected import

interface Tag {
    id: string;
    name: string;
}

export default function FilterBar() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        // Fetch all available tags
        const fetchTags = async () => {
            const { data, error } = await supabase.from('tags').select('id, name');
            if (data) {
                setAvailableTags(data);
            }
            if (error) {
                console.error('Error fetching tags:', error);
            }
        };
        fetchTags();
    }, []);

    useEffect(() => {
        // Initialize selected tags from URL
        const tagsParam = searchParams.get('tags');
        if (tagsParam) {
            setSelectedTags(tagsParam.split(','));
        } else {
            setSelectedTags([]);
        }
    }, [searchParams]);

    const handleTagChange = (tagId: string) => {
        let newSelectedTags;
        if (selectedTags.includes(tagId)) {
            newSelectedTags = selectedTags.filter((tag) => tag !== tagId);
        } else {
            newSelectedTags = [...selectedTags, tagId];
        }
        setSelectedTags(newSelectedTags);

        const params = new URLSearchParams(searchParams.toString());
        if (newSelectedTags.length > 0) {
            params.set('tags', newSelectedTags.join(','));
        } else {
            params.delete('tags');
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="p-4 bg-gray-100 rounded-lg mb-4 flex flex-wrap gap-2">
            <span className="font-semibold mr-2">Filter by Tags:</span>
            {availableTags.map((tag) => (
                <button
                    key={tag.id}
                    onClick={() => handleTagChange(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                        selectedTags.includes(tag.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    {tag.name}
                </button>
            ))}
        </div>
    );
}
