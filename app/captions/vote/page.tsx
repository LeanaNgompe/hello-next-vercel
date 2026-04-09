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

  const { data: captions, error: captionsError } = await supabase
    .from('captions')
    .select('*, images(url)')
    .order('created_datetime_utc', { ascending: false });

  const { data: allVotes, error: votesError } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value');

  if (captionsError || votesError) {
    console.error('Data fetching error:', captionsError || votesError);
    return (
      <div className="flex items-center justify-center min-h-[400px] text-[#E85C4A] font-bold uppercase tracking-widest text-xs">
        System offline. Try again.
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
    <main className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-20">
        <header className="mb-16 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-[#2B2B2B] italic">
              VOTING TERMINAL
            </h1>
            <p className="text-[#8C8C8C] text-xs font-bold uppercase tracking-[0.4em]">
              Editorial Review / Consensus Protocol
            </p>
          </div>
          
          <Link 
            href="/captions" 
            className="inline-flex items-center gap-2 text-[10px] font-black text-[#8C8C8C] uppercase tracking-widest hover:text-[#2B2B2B] transition-colors"
          >
            <FiArrowLeft /> Exit to Archives
          </Link>
        </header>
        
        <CaptionsList initialCaptions={processedCaptions} user={user} mode="vote" />
      </div>
    </main>
  );
}
