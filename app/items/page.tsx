import { supabase } from '../../lib/supabase'

export const revalidate = 0 // Opt out of caching for this page

export default async function ItemsPage() {
  const { data: captions, error } = await supabase
    .from('captions')
    .select('*, images(url)') // Select all from captions and 'url' from related images

  if (error) {
    console.error('Error fetching captions:', error.message || error);
    return <div>Error loading captions.</div>
  }

  return (
    <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Captions List</h1>
      {captions && captions.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {captions.map((caption: any) => (
            <div key={caption.id} style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              backgroundColor: '#fff',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {caption.images && caption.images.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={caption.images.url}
                  alt={`Image for caption ${caption.id}`}
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderBottom: '1px solid #eee' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '200px', backgroundColor: '#f0f0f0',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888',
                  borderBottom: '1px solid #eee'
                }}>
                  No Image Available
                </div>
              )}
              <div style={{ padding: '15px' }}>
                <p style={{ margin: '0', fontSize: '1.1em', color: '#333', lineHeight: '1.5' }}>
                  {caption.content || 'No content provided for this caption.'}
                </p>
                {/* Optional: Display more details */}
                {caption.created_datetime_utc && (
                  <p style={{ fontSize: '0.85em', color: '#777', marginTop: '10px' }}>
                    Created: {new Date(caption.created_datetime_utc).toLocaleDateString()}
                  </p>
                )}
                {caption.like_count !== undefined && (
                  <p style={{ fontSize: '0.85em', color: '#777', marginTop: '5px' }}>
                    Likes: {caption.like_count}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#777', marginTop: '50px' }}>
          No captions found. Please ensure your 'captions' table exists and has data.
          Also, verify that `image_id` in 'captions' correctly links to 'images' table.
        </p>
      )}
    </main>
  )
}