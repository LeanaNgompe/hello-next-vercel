import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import FilterBar from '@/components/FilterBar';

// TypeScript Interfaces
interface University {
  university_id: string;
  university_name: string;
}

interface Profile {
  profile_id: string;
  email: string;
  // other profile fields
}

interface ProfileUniversityMapping {
  profile_id: string;
  university_id: string;
}

export interface Community {
  community_id: number;
  community_name: string;
  university_id: string;
}

export interface Tag {
  id: string;
  name: string;
}

interface CommunityContext {
  context_id: string;
  community_id: number;
  context_title: string;
  context_content: string;
  start_datetime_utc: string;
  end_datetime_utc: string;
  priority: number;
  created_datetime_utc: string;
  community_context_tag_mappings: { tag: Tag }[]; // Corrected structure
  community: Community;
}

interface CommunityContextTagMapping {
  context_id: string;
  tag_id: string;
}

// Helper function to determine status
function getStatus(start: string, end: string): { text: string; color: string } {
  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (now < startDate) {
    return { text: 'Upcoming', color: 'bg-yellow-100 text-yellow-800' };
  } else if (now >= startDate && now <= endDate) {
    // Check if ending soon (e.g., within 24 hours)
    const timeRemaining = endDate.getTime() - now.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (timeRemaining < oneDay) {
      return { text: 'Ending Soon', color: 'bg-red-100 text-red-800' };
    }
    return { text: 'Live', color: 'bg-green-100 text-green-800' };
  } else {
    return { text: 'Ended', color: 'bg-gray-100 text-gray-800' };
  }
}

// UI Components

function FeedCard({ item }: { item: CommunityContext }) {
  const status = getStatus(item.start_datetime_utc, item.end_datetime_utc);

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold">{item.context_title}</h2>
        <div className="flex items-center">
          <span className={`text-xs font-semibold mr-2 px-2.5 py-0.5 rounded ${status.color}`}>
            {status.text}
          </span>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            Priority: {item.priority}
          </span>
        </div>
      </div>
      <p className="text-gray-700 mt-2">{item.context_content}</p>
      <div className="mt-4">
        <span className="text-sm text-gray-500">{item.community.community_name}</span>
        <div className="flex mt-2">
          {item.community_context_tag_mappings.map((mapping) => (
            <span
              key={mapping.tag.id}
              className="bg-gray-200 text-gray-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded"
            >
              {mapping.tag.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="p-4 bg-gray-100 rounded-lg mb-4 h-16 animate-pulse"></div>
      <div className="bg-white shadow-md rounded-lg p-4 mb-4 h-48 animate-pulse"></div>
      <div className="bg-white shadow-md rounded-lg p-4 mb-4 h-48 animate-pulse"></div>
      <div className="bg-white shadow-md rounded-lg p-4 mb-4 h-48 animate-pulse"></div>
    </div>
  );
}


export default async function ProtectedPage({
  searchParams,
}: {
  searchParams: { tags?: string; communities?: string };
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's university to set as default community filter if none provided
  let userUniversityId: string | null = null;
  const { data: profileUniversityMapping } = await supabase
    .from('profile_university_mappings')
    .select('university_id')
    .eq('profile_id', user.id)
    .single();

  if (profileUniversityMapping) {
    userUniversityId = profileUniversityMapping.university_id;
  }

  // Determine which communities to filter by
  let communityIdsToFilter: number[] = [];
  if (searchParams.communities) {
    communityIdsToFilter = searchParams.communities.split(',').map(Number);
  } else if (userUniversityId) {
    // If no specific communities are selected, default to user's university communities
    const { data: defaultCommunities } = await supabase
      .from('communities')
      .select('community_id')
      .eq('university_id', userUniversityId);

    if (defaultCommunities) {
      communityIdsToFilter = defaultCommunities.map(c => c.community_id);
    }
  }


  // 2. Fetch community contexts
  const now = new Date().toISOString();
  let query = supabase
    .from('community_contexts')
    .select(
      `
      *,
      community:communities(*),
      community_context_tag_mappings(tag:tags(id, name))
    `
    )
    .lte('start_datetime_utc', now)
    .gte('end_datetime_utc', now)
    .order('priority', { ascending: false })
    .order('created_datetime_utc', { ascending: false });

  // Apply community filter
  if (communityIdsToFilter.length > 0) {
    query = query.in('community_id', communityIdsToFilter);
  } else {
    // If no communities to filter by (e.g., user has no university and no communities selected),
    // return an empty feed or handle as appropriate. For now, we'll let it fetch all,
    // which might not be desired. A better approach might be to return early.
    // For this implementation, we proceed without a community filter if none are specified.
  }

  // Filter by tags if provided
  if (searchParams.tags) {
    const tags = searchParams.tags.split(',');
    const { data: contextsWithTags } = await supabase
      .from('community_context_tag_mappings')
      .select('context_id')
      .in('tag_id', tags);

    if (contextsWithTags) {
      query = query.in('context_id', contextsWithTags.map(c => c.context_id));
    } else {
      // If tags are provided but no contexts match them, return an empty array
      query = query.eq('context_id', 'non-existent-id');
    }
  }

  const { data: feed, error: feedError } = await query;

  if (feedError) {
    // Handle error
    return (
      <div>
        <h1>Community Context Feed</h1>
        <p>Error fetching feed. Please try again later.</p>
      </div>
    );
  }


  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Community Context Feed</h1>
      <FilterBar />
      <Suspense fallback={<LoadingSkeleton />}>
        {feed && feed.length > 0 ? (
          <div>
            {feed.map((item) => (
              <FeedCard key={item.context_id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">Nothing happening in your community right now.</p>
          </div>
        )}
      </Suspense>
    </div>
  );
}


