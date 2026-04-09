'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { FiGrid, FiThumbsUp, FiPlusCircle, FiLogOut, FiLogIn, FiMenu, FiX } from 'react-icons/fi';

export default function Sidebar() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setUser(user);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const navLinks = [
    { name: 'Explore Gallery', href: '/captions', icon: FiGrid },
    { name: 'Vote & Rank', href: '/captions/vote', icon: FiThumbsUp, authRequired: true },
    { name: 'Generate AI', href: '/captions/new', icon: FiPlusCircle, authRequired: true },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg"
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 transform lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              C
            </div>
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
              Crackd
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-4">
            Navigation
          </p>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            if (link.authRequired && !user) return null;

            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all duration-200",
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[3]" : "stroke-[2.5]")} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-900">
          {user ? (
            <div className="space-y-3">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
              >
                <FiLogOut /> Logout
              </button>
            </div>
          ) : (
            <Link 
              href="/auth/login" 
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FiLogIn /> Log In
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

// Helper for Tailwind classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
