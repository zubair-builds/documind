"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { BrainCircuit, Menu, X } from "lucide-react";

const HeaderContent = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const view = searchParams.get('view');
  const isLanding = pathname === '/' && view !== 'upload' && view !== 'chat';
  const isUpload = pathname === '/' && (view === 'upload' || view === 'chat');

  return (
    <>
      <nav className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                DocuMind
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">

              {session && (
                <>
                  <Link href="/history" className={`text-sm hover:text-white transition-colors ${pathname.startsWith('/history') ? 'text-white font-medium' : 'text-slate-300'}`}>History</Link>
                  <Link href="/analytics" className={`text-sm hover:text-white transition-colors ${pathname.startsWith('/analytics') ? 'text-white font-medium' : 'text-slate-300'}`}>Analytics</Link>
                  <Link href="/passwords" className={`text-sm hover:text-white transition-colors ${pathname.startsWith('/passwords') ? 'text-white font-medium' : 'text-slate-300'}`}>Passwords</Link>
                </>
              )}

              <div className="flex items-center space-x-4">
                {session ? (
                  <>
                    <button onClick={() => signOut()} className="text-sm text-slate-300 hover:text-white transition-colors">Log Out</button>
                    <button
                      onClick={() => router.push('/?view=upload')}
                      className="px-4 py-2 text-sm font-medium rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                      Upload
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Log In</Link>
                    <Link href="/signup" className="text-sm text-slate-300 hover:text-white transition-colors">Sign Up</Link>
                    <button
                      onClick={() => router.push('/?view=upload')}
                      className="px-4 py-2 text-sm font-medium rounded-full bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                      Try for Free
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Nav Toggle */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-300 p-2">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 absolute w-full z-40">
          <div className="px-4 pt-2 pb-4 space-y-3">
            {session && (
              <>
                <Link href="/history" onClick={() => setIsMenuOpen(false)} className="block w-full text-left text-slate-300 py-2">History</Link>
                <Link href="/analytics" onClick={() => setIsMenuOpen(false)} className="block w-full text-left text-slate-300 py-2">Analytics</Link>
                <Link href="/passwords" onClick={() => setIsMenuOpen(false)} className="block w-full text-left text-slate-300 py-2">Passwords</Link>
              </>
            )}

            {session ? (
              <>
                <button onClick={() => { signOut(); setIsMenuOpen(false); }} className="block w-full text-left text-slate-300 py-2">Log Out</button>
                <button
                  onClick={() => { router.push('/?view=upload'); setIsMenuOpen(false); }}
                  className="block w-full text-center px-4 py-2 mt-4 text-sm font-medium rounded-lg bg-indigo-600 text-white"
                >
                  Upload Document
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-left text-slate-300 py-2">Log In</Link>
                <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="block w-full text-left text-slate-300 py-2">Sign Up</Link>
                <button
                  onClick={() => { router.push('/?view=upload'); setIsMenuOpen(false); }}
                  className="block w-full text-center px-4 py-2 mt-4 text-sm font-medium rounded-lg bg-white text-slate-900"
                >
                  Try for Free
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const Header = () => {
  return (
    <Suspense fallback={<div className="h-16 bg-slate-950 border-b border-slate-800/60" />}>
      <HeaderContent />
    </Suspense>
  );
};

export default Header;
