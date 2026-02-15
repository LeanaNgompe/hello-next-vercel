import { createSupabaseServerClient } from '../../lib/supabase/server';
import CaptionsList from '../../components/CaptionsList';


interface ItemsPageProps {
  searchParams: {
    tags?: string;
  };
}

export default async function ItemsPage({ searchParams = {} }: ItemsPageProps) {
  const supabase = await createSupabaseServerClient();

  let query = supabase.from('captions').select('*, images(url)');

  const { data: captions, error } = await query;

  if (error) {
    console.error('Error fetching captions:', error.message || error);
    return <div className="text-center text-gray-500 mt-10">Error loading captions.</div>;
  }

  return <CaptionsList initialCaptions={captions ?? []} />;
}

