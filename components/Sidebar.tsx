'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription?.unsubscribe(); // Corrected line
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login'); // Redirect to login page after logout
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="text-2xl font-bold text-gray-800">
          Leana's Crak'd
        </Link>
      </div>
      <nav className="flex flex-col p-4 space-y-2 flex-grow">
        <Link href="/hello-world" className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100">
          Hello World
        </Link>
        <Link href="/captions" className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100">
          Captions List
        </Link>
        <Link href="/protected" className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100">
          Protected
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-200">
        {user ? (
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Logout ({user.email})
          </button>
        ) : (
          <Link href="/auth/login" className="w-full px-4 py-2 rounded-md bg-blue-500 text-white text-center hover:bg-blue-600 transition-colors block">
            Login
          </Link>
        )}
      </div>
    </aside>
  );
}
