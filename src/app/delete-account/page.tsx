'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const [email, setEmail]       = useState('');
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit() {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/user/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.message ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-sm bg-slate-900/80">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">♠</span>
          <span className="text-lg font-semibold tracking-wide">Poker 77</span>
        </Link>
        <div className="flex gap-6 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms"   className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-20">

        {status === 'success' ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center text-3xl">
              ✓
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Check your email</h1>
              <p className="text-slate-400 leading-relaxed">
                If an account is registered with{' '}
                <span className="text-white font-medium">{email}</span>, we have sent a
                deletion confirmation link to that address. The link expires in{' '}
                <span className="text-white">1 hour</span>.
              </p>
            </div>
            <p className="text-slate-500 text-sm">
              Didn&apos;t receive it?{' '}
              <button
                onClick={() => { setStatus('idle'); setEmail(''); }}
                className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
              >
                Try again
              </button>
            </p>
            <Link
              href="/"
              className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="flex flex-col gap-8">

            {/* Header */}
            <div>
              <p className="text-xs font-medium text-red-400 uppercase tracking-widest mb-3">
                Danger zone
              </p>
              <h1 className="text-3xl font-bold mb-3">Delete your account</h1>
              <p className="text-slate-400 leading-relaxed">
                Enter the email address associated with your Poker 77 account. We will send
                you a confirmation link — clicking it will permanently delete your account
                and all associated data.
              </p>
            </div>

            {/* Warning box */}
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-5 flex flex-col gap-2">
              <p className="text-red-300 font-semibold text-sm">This action is permanent and cannot be undone.</p>
              <ul className="flex flex-col gap-1.5 mt-1">
                {[
                  'Your player profile and username will be removed.',
                  'Your wallet balance and transaction history will be deleted.',
                  'Any pending withdrawals will be cancelled.',
                  'You will not be able to recover your account after deletion.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-400 text-sm">
                    <span className="text-red-500 mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-300">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); setStatus('idle'); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@example.com"
                  disabled={status === 'loading'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-600/60 focus:ring-1 focus:ring-red-600/40 transition-colors disabled:opacity-50"
                />
                {errorMsg && (
                  <p className="text-red-400 text-sm mt-1">{errorMsg}</p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={status === 'loading' || !email.trim()}
                className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl transition-colors"
              >
                {status === 'loading' ? 'Sending link...' : 'Send deletion link'}
              </button>
            </div>

            <p className="text-center text-sm text-slate-500">
              Changed your mind?{' '}
              <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Go back home
              </Link>
            </p>

          </div>
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
