'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function DeleteAccountConfirmPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setMessage('No deletion token found. This link may be invalid or expired.');
      setStatus('error');
      return;
    }

    async function confirm() {
      try {
        const res = await fetch(`/api/user/delete-confirm?token=${encodeURIComponent(token!)}`, {
          method: 'GET',
        });
        const data = await res.json();

        if (!res.ok) {
          setMessage(data?.message ?? 'This link is invalid or has expired. Please request a new one.');
          setStatus('error');
          return;
        }

        setMessage(data?.message ?? 'Your account has been deleted successfully.');
        setStatus('success');
      } catch {
        setMessage('Network error. Please check your connection and try again.');
        setStatus('error');
      }
    }

    confirm();
  }, [token]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-sm bg-slate-900/80">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">♠</span>
          <span className="text-lg font-semibold tracking-wide">Poker 77</span>
        </Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <div>
              <h1 className="text-2xl font-bold mb-2">Verifying your request...</h1>
              <p className="text-slate-400">Please wait while we process your account deletion.</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center text-3xl">
              ✓
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Account deleted</h1>
              <p className="text-slate-400 leading-relaxed">{message}</p>
            </div>
            <p className="text-slate-500 text-sm max-w-sm">
              All your personal data, wallet balance, and game history have been permanently
              removed from our systems.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Back to home
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center text-3xl">
              ✕
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Link invalid or expired</h1>
              <p className="text-slate-400 leading-relaxed">{message}</p>
            </div>
            <Link
              href="/delete-account"
              className="mt-2 inline-flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Request a new link
            </Link>
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-400 transition-colors">
              Back to home
            </Link>
          </>
        )}

      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-8 mt-10">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-sm">
          <Link href="/" className="flex items-center gap-2 hover:text-slate-400 transition-colors">
            <span>♠</span>
            <span>Poker 77</span>
          </Link>
          <p>&copy; {new Date().getFullYear()} JDPC Global Pvt Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-slate-400 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
