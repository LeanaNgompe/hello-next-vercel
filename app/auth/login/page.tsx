'use client';

import { createBrowserClient } from '@supabase/ssr';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Login with Google</h1>
        <Button
          onClick={handleGoogleLogin}
          className="flex items-center justify-center px-4 py-2 bg-white text-gray-700 rounded-md shadow-md hover:bg-gray-50"
        >
          <FcGoogle className="w-6 h-6 mr-2" />
          <span>Sign in with Google</span>
        </Button>
      </div>
    </div>
  );
}
