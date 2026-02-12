import { createSupabaseServerClient } from '../../lib/supabase/server';
import CaptionsList from '../../components/CaptionsList';

export default async function ItemsPage() {
  const supabase = await createSupabaseServerClient(); // ✅ FIX

  const { data: captions, error } = await supabase
    .from('captions')
    .select('*, images(url)');

  if (error) {
    console.error('Error fetching captions:', error.message || error);
    return <div className="text-center text-gray-500 mt-10">Error loading captions.</div>;
  }

  return <CaptionsList initialCaptions={captions || []} />;
}

