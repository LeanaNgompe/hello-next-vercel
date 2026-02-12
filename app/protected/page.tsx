import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default async function ProtectedPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const handleSignOut = async () => {
    'use server';
    await supabase.auth.signOut();
    redirect('/auth/login');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">Protected Page</h1>
      <p className="mb-4">Welcome, {session.user.email}!</p>
      <form action={handleSignOut}>
        <Button type="submit">Sign Out</Button>
      </form>
    </div>
  );
}
