import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Protected</h1>
      <p>Welcome {user.email}</p>
    </main>
  )
}

