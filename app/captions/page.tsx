import { createSupabaseServerClient } from '../../lib/supabase/server';
import CaptionsList from '../../components/CaptionsList';

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

  // 3. Calculate 'like_count' for each caption by summing 'vote_value'
  const likesMap = (allVotes || []).reduce((acc: Record<string, number>, vote) => {
    acc[vote.caption_id] = (acc[vote.caption_id] || 0) + (vote.vote_value || 0);
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
    like_count: likesMap[caption.id] || 0,
    user_vote: userVotesMap[caption.id] || 0, // 1 for up, -1 for down, 0 for none
  }));

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-10 space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Caption Gallery
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Explore and vote for the community's best captions.
          </p>
        </header>
        
        <CaptionsList initialCaptions={processedCaptions} user={user} />
      </div>
    </main>
  );
}
