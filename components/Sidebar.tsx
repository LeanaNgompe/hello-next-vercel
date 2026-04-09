'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setUser(user);
        if (user) {
          console.log('Auth state changed - user logged in with uid:', user.id);
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        console.log('Initial session - user logged in with uid:', user.id);
      }
    });

    return () => {
      authListener.subscription?.unsubscribe(); // Corrected line
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
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
      </nav>
      <div className="p-4 border-t border-gray-200">
        {user ? (
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Logout
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
