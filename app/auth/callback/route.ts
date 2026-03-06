import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
    } else {
      const uid = data?.session?.user?.id
      if (uid) {
        console.log('User logged in with uid:', uid)
      } else {
        console.log('User logged in but UID was not available')
      }
    }
  }

  return NextResponse.redirect(`${origin}`)
}

