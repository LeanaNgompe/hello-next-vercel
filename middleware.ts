import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll() // ✅ correct API
        },
        setAll(cookiesToSet) {            // ✅ correct API
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 🔒 Protect gated route
  if (!user && pathname.startsWith('/protected')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 🔁 Prevent logged-in users from seeing login page
  if (user && pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/protected', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/protected/:path*',
    '/auth/login',
  ],
}
