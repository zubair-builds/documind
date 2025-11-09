"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const Header = () => {
  const { data: session } = useSession();

  return (
    <header className="bg-gray-800 text-white p-4">
      <nav className="container mx-auto flex justify-between">
        <ul className="flex space-x-4">
          <li>
            <Link href="/" className="hover:text-gray-300">
              Home
            </Link>
          </li>
          {session && (
            <>
              <li>
                <Link href="/history" className="hover:text-gray-300">
                  History
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-gray-300">
                  Analytics
                </Link>
              </li>
              <li>
                <Link href="/passwords" className="hover:text-gray-300">
                  Passwords
                </Link>
              </li>
            </>
          )}
        </ul>
        <ul className="flex space-x-4">
          {session ? (
            <li>
              <button onClick={() => signOut()} className="hover:text-gray-300">
                Logout
              </button>
            </li>
          ) : (
            <>
              <li>
                <Link href="/login" className="hover:text-gray-300">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-gray-300">
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
