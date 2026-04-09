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
    { name: 'GALLERY', href: '/captions', icon: FiGrid },
    { name: 'VOTE', href: '/captions/vote', icon: FiThumbsUp, authRequired: true },
    { name: 'CREATE', href: '/captions/new', icon: FiPlusCircle, authRequired: true },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#F5EFE6] border border-[#2B2B2B] rounded-sm"
      >
        {isOpen ? <FiX className="w-6 h-6 text-[#2B2B2B]" /> : <FiMenu className="w-6 h-6 text-[#2B2B2B]" />}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-none"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-60 bg-[#F5EFE6] border-r border-[#2B2B2B] flex flex-col transition-transform duration-300 transform lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-10 border-b border-[#2B2B2B]">
          <Link href="/" className="flex flex-col gap-1 group">
            <span className="text-3xl font-black text-[#2B2B2B] tracking-tighter leading-none italic">
              CRACKD
            </span>
            <span className="text-[10px] font-bold text-[#8C8C8C] tracking-[0.2em] uppercase">
              Editorial Feed
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-6 pt-10 space-y-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            if (link.authRequired && !user) return null;

            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block text-sm font-bold tracking-widest transition-all duration-200 py-1",
                  isActive 
                    ? "text-[#E85C4A] border-b border-[#E85C4A] w-fit" 
                    : "text-[#2B2B2B] hover:text-[#E85C4A]"
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-[#2B2B2B] space-y-4">
          {user ? (
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-[#8C8C8C] tracking-widest uppercase">
                {user.email?.split('@')[0]}
              </div>
              <button
                onClick={handleSignOut}
                className="text-[10px] font-bold text-[#2B2B2B] hover:text-[#E85C4A] tracking-widest uppercase flex items-center gap-2 transition-colors"
              >
                <FiLogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          ) : (
            <Link 
              href="/auth/login" 
              onClick={() => setIsOpen(false)}
              className="block w-full py-3 bg-[#2B2B2B] text-[#F5EFE6] text-center text-xs font-bold tracking-widest uppercase hover:bg-[#E85C4A] transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
