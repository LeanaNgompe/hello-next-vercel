import { createSupabaseServerClient } from '../../lib/supabase/server';
import CaptionsList from '../../components/CaptionsList';


interface ItemsPageProps {
  searchParams: {
    tags?: string;
  };
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const supabase = await createSupabaseServerClient();

  const filterTagNames = searchParams.tags ? searchParams.tags.split(',') : [];

  let captionIdsToFilter: string[] | undefined;
  if (filterTagNames.length > 0) {
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('id')
      .in('name', filterTagNames);

    if (tagsError) {
      console.error('Error fetching tags:', tagsError.message || tagsError);
      captionIdsToFilter = undefined;
    } else {
      const tagIds = tagsData.map(tag => tag.id);

      const { data: captionTagsData, error: captionTagsError } = await supabase
        .from('caption_tags')
        .select('caption_id')
        .in('tag_id', tagIds);

      if (captionTagsError) {
        console.error('Error fetching caption_tags:', captionTagsError.message || captionTagsError);
        captionIdsToFilter = undefined;
      } else {
        captionIdsToFilter = captionTagsData.map(ct => ct.caption_id);
      }
    }
  }

  let query = supabase.from('captions').select('*, images(url)');

  if (captionIdsToFilter && captionIdsToFilter.length > 0) {
    query = query.in('id', captionIdsToFilter);
  } else if (filterTagNames.length > 0 && (!captionIdsToFilter || captionIdsToFilter.length === 0)) {
    query = query.in('id', ['-1']);
  }

  const { data: captions, error } = await query;

  if (error) {
    console.error('Error fetching captions:', error.message || error);
    return <div className="text-center text-gray-500 mt-10">Error loading captions.</div>;
  }
}

