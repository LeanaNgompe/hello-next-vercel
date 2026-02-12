import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing environment variables for Supabase')
}

export function createServerClient(
  componentContext: 'route_handler' | 'page_server' = 'page_server'
) {
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        switch (componentContext) {
          case 'page_server':
          case 'route_handler':
            return cookies().get(name)?.value
        }
      },
      set(name: string, value: string, options: CookieOptions) {
        cookies().set(name, value, options)
      },
      remove(name: string, options: CookieOptions) {
        cookies().set(name, '', options)
      },
    },
  })
}
