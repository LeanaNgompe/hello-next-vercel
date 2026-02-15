import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// TypeScript Interfaces
interface SidechatPost {
  id: string;
  content: string;
  created_datetime_utc: string;
  like_count: number;
}

// UI Components
function PostCard({ post }: { post: SidechatPost }) {
  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <p className="text-gray-700">{post.content}</p>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {new Date(post.created_datetime_utc).toLocaleString()}
        </span>
        <span className="text-sm text-gray-500">{post.like_count} likes</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="bg-white shadow-md rounded-lg p-4 mb-4 h-24 animate-pulse"></div>
      <div className="bg-white shadow-md rounded-lg p-4 mb-4 h-24 animate-pulse"></div>
      <div className="bg-white shadow-md rounded-lg p-4 mb-4 h-24 animate-pulse"></div>
    </div>
  );
}

async function MostRecentPosts() {
  const supabase = await createSupabaseServerClient();
  const { data: posts, error } = await supabase
    .from('sidechat_posts')
    .select('*')
    .order('created_datetime_utc', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching most recent posts:', error);
    return <p className="text-red-500">Error fetching recent posts.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Most Recent Posts</h2>
      {posts && posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <p>No recent posts found.</p>
      )}
    </div>
  );
}

async function MostPopularPosts() {
  const supabase = await createSupabaseServerClient();
  const { data: posts, error } = await supabase
    .from('sidechat_posts')
    .select('*')
    .order('like_count', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching most popular posts:', error);
    return <p className="text-red-500">Error fetching popular posts.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Most Popular Posts</h2>
      {posts && posts.length > 0 ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <p>No popular posts found.</p>
      )}
    </div>
  );
}

export default async function ProtectedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Sidechat Feed</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Suspense fallback={<LoadingSkeleton />}>
          <MostRecentPosts />
        </Suspense>
        <Suspense fallback={<LoadingSkeleton />}>
          <MostPopularPosts />
        </Suspense>
      </div>
    </div>
  );
}
