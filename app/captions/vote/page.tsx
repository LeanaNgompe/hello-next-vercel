import { createSupabaseServerClient } from '../../../lib/supabase/server';
import CaptionsList from '../../../components/CaptionsList';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

export default async function VotePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // 1. Fetch all captions with related images
  const { data: captions, error: captionsError } = await supabase
    .from('captions')
    .select('*, images(url)')
    .order('created_datetime_utc', { ascending: false });

  // 2. Fetch all votes to calculate averages
  const { data: allVotes, error: votesError } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value');

  if (captionsError || votesError) {
    console.error('Data fetching error:', captionsError || votesError);
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500 font-medium">
        Unable to load content. Please try again.
      </div>
    );
  }

  const scoreMap = (allVotes || []).reduce((acc: Record<string, { totalScore: number, count: number }>, vote) => {
    if (!acc[vote.caption_id]) {
      acc[vote.caption_id] = { totalScore: 0, count: 0 };
    }
    acc[vote.caption_id].totalScore += vote.vote_value;
    acc[vote.caption_id].count += 1;
    return acc;
  }, {});

  // 3. User's specific votes
  const { data: myVotes } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value')
    .eq('profile_id', user.id);
  
  const userVotesMap = (myVotes || []).reduce((acc: Record<string, number>, vote) => {
    acc[vote.caption_id] = vote.vote_value;
    return acc;
  }, {});

  const processedCaptions = (captions || []).map((caption: any) => ({
    ...caption,
    avg_score: scoreMap[caption.id]?.count > 0 ? (scoreMap[caption.id].totalScore / scoreMap[caption.id].count).toFixed(1) : 0,
    vote_count: scoreMap[caption.id]?.count || 0,
    user_vote: userVotesMap[caption.id] || 0,
  }));

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-10 space-y-4">
          <Link 
            href="/captions" 
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft /> Back to Gallery
          </Link>
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Vote & Rank
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Help the community find the best captions.
            </p>
          </div>
        </header>
        
        <CaptionsList initialCaptions={processedCaptions} user={user} mode="vote" />
      </div>
    </main>
  );
}
