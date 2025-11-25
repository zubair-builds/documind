"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const Header = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="container mx-auto flex justify-between items-center" aria-label="Main navigation">
        <div className="flex items-center">
          <button
            className="md:hidden mr-2 p-2 rounded focus:outline-none focus:ring"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="material-icons">menu</span>
          </button>
          <ul className={`flex-col md:flex-row md:flex space-x-0 md:space-x-4 ${menuOpen ? 'flex' : 'hidden'} md:space-y-0 space-y-2 md:space-y-0 md:items-center md:static absolute bg-gray-800 md:bg-transparent left-0 top-16 w-full md:w-auto z-10 p-4 md:p-0`}> 
            <li>
              <Link href="/" className={`hover:text-gray-300 ${pathname === '/' ? 'underline font-bold' : ''}`} aria-current={pathname === '/' ? 'page' : undefined}>
                Home
              </Link>
            </li>
            {session && (
              <>
                <li>
                  <Link href="/history" className={`hover:text-gray-300 ${pathname.startsWith('/history') ? 'underline font-bold' : ''}`} aria-current={pathname.startsWith('/history') ? 'page' : undefined}>
                    History
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className={`hover:text-gray-300 ${pathname.startsWith('/analytics') ? 'underline font-bold' : ''}`} aria-current={pathname.startsWith('/analytics') ? 'page' : undefined}>
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link href="/passwords" className={`hover:text-gray-300 ${pathname.startsWith('/passwords') ? 'underline font-bold' : ''}`} aria-current={pathname.startsWith('/passwords') ? 'page' : undefined}>
                    Passwords
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
        <ul className="flex space-x-4 items-center">
          {session ? (
            <li>
              <button onClick={() => signOut()} className="hover:text-gray-300">
                Logout
              </button>
            </li>
          ) : (
            <>
              <li>
                <Link href="/login" className={`hover:text-gray-300 ${pathname.startsWith('/login') ? 'underline font-bold' : ''}`} aria-current={pathname.startsWith('/login') ? 'page' : undefined}>
                  Login
                </Link>
              </li>
              <li>
                <Link href="/signup" className={`hover:text-gray-300 ${pathname.startsWith('/signup') ? 'underline font-bold' : ''}`} aria-current={pathname.startsWith('/signup') ? 'page' : undefined}>
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
