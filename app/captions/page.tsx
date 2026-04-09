import { createSupabaseServerClient } from '../../lib/supabase/server';
import CaptionsList from '../../components/CaptionsList';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CaptionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch all captions with related images (images.url)
  const { data: captions, error: captionsError } = await supabase
    .from('captions')
    .select('*, images(url)')
    .order('created_datetime_utc', { ascending: false });

  // 2. Fetch all votes from 'caption_votes' to calculate 'like_count'
  const { data: allVotes, error: votesError } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value');

  if (captionsError || votesError) {
    console.error('Data fetching error:', captionsError || votesError);
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500 font-medium">
        Unable to load captions. Please check your connection.
      </div>
    );
  }

  // 3. Calculate average score and total votes for each caption
  const scoreMap = (allVotes || []).reduce((acc: Record<string, { totalScore: number, count: number }>, vote) => {
    if (!acc[vote.caption_id]) {
      acc[vote.caption_id] = { totalScore: 0, count: 0 };
    }
    acc[vote.caption_id].totalScore += vote.vote_value;
    acc[vote.caption_id].count += 1;
    return acc;
  }, {});

  // 4. Fetch the current user's specific votes for active button states
  let userVotesMap: Record<string, number> = {};
  if (user) {
    const { data: myVotes } = await supabase
      .from('caption_votes')
      .select('caption_id, vote_value')
      .eq('profile_id', user.id);
    
    userVotesMap = (myVotes || []).reduce((acc: Record<string, number>, vote) => {
      acc[vote.caption_id] = vote.vote_value;
      return acc;
    }, {});
  }

  // 5. Merge counts and user status into the captions data
  const processedCaptions = (captions || []).map((caption: any) => ({
    ...caption,
    avg_score: scoreMap[caption.id]?.count > 0 ? (scoreMap[caption.id].totalScore / scoreMap[caption.id].count).toFixed(1) : 0,
    vote_count: scoreMap[caption.id]?.count || 0,
    user_vote: userVotesMap[caption.id] || 0, // 1-5, or 0 for none
  }));

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Caption Gallery
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Explore and vote for the community's best captions.
            </p>
            {user && processedCaptions.length === 0 && (
              <p className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm font-medium border border-yellow-200 dark:border-yellow-800">
                DEBUG: No captions were returned from the database. This is likely an RLS issue.
              </p>
            )}
            {user && processedCaptions.length > 0 && processedCaptions.every(c => c.user_vote !== 0) && (
              <p className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-800">
                DEBUG: You have already voted on all {processedCaptions.length} captions in the database.
              </p>
            )}
          </div>
          
          {user && (
            <Link 
              href="/captions/new"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>Create New</span>
            </Link>
          )}
        </header>
        
        <CaptionsList initialCaptions={processedCaptions} user={user} mode="gallery" />
      </div>
    </main>
  );
}
