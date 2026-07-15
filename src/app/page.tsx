import { cookies } from 'next/headers';
import { verifyToken } from '@/utils/jwt';
import Link from 'next/link';

function isAdminLoggedIn(): boolean {
  const token = cookies().get('token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return !!payload && payload.role === 'admin';
}

export default function HomePage() {
  const loggedIn = isAdminLoggedIn();
  const ctaHref  = loggedIn ? '/admin/overview' : '/auth/login';
  const ctaLabel = loggedIn ? 'Go to Dashboard' : 'Admin Login';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-sm bg-slate-900/80">
        <div className="flex items-center gap-2">
          <span className="text-2xl">♠</span>
          <span className="text-lg font-semibold tracking-wide">PokerApp</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features"   className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">Features</a>
          <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">How It Works</a>
          <a href="#game-modes" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">Game Modes</a>
          <Link
            href={ctaHref}
            className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors"
          >
            {ctaLabel}
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 gap-8">
        <div className="flex gap-4 text-5xl select-none animate-pulse">
          <span>♠</span><span className="text-red-400">♥</span><span className="text-red-400">♦</span><span>♣</span>
        </div>
        <div className="inline-flex items-center gap-2 bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block"></span>
          Live multiplayer tables available now
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl leading-tight">
          Real-Money Poker,{' '}
          <span className="text-indigo-400">Built for the Modern Table</span>
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl leading-relaxed">
          A fully managed multiplayer poker platform — live cash games, practice
          tables, real-time gameplay, Razorpay payments, and complete admin
          controls. Powered by Next.js, MongoDB, and Socket.IO.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-indigo-900/40"
          >
            {ctaLabel}
            <span aria-hidden>→</span>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-slate-300 hover:text-white font-medium px-8 py-4 rounded-xl text-lg transition-colors"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-white/5 py-10 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: '6',       label: 'Players per table' },
            { value: '60s',     label: 'Turn timer' },
            { value: '3',       label: 'Bot difficulty levels' },
            { value: '24 / 7',  label: 'Always on' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-4xl font-bold text-indigo-400">{value}</span>
              <span className="text-sm text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to run a poker platform</h2>
            <p className="text-slate-400 max-w-xl mx-auto">From the game engine to payments and admin tools — it is all here, production-ready.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🃏',
                title: 'Live Cash Games',
                body: 'Real-money tables with configurable blinds, buy-ins, and seat limits. Multiple game modes run simultaneously.',
              },
              {
                icon: '🤖',
                title: 'Practice Mode',
                body: 'Play against intelligent bots at easy, medium, or hard difficulty. Perfect for new players learning the game.',
              },
              {
                icon: '⚡',
                title: 'Real-Time Engine',
                body: 'Socket.IO-powered game engine with turn timers, auto-fold, reconnect window, and bot eviction logic.',
              },
              {
                icon: '💳',
                title: 'Razorpay Payments',
                body: 'Integrated Razorpay gateway for deposits. Manual withdrawal flow with admin approval and audit trail.',
              },
              {
                icon: '🛡️',
                title: 'Admin Dashboard',
                body: 'Full oversight — manage tables, game modes, users, wallet balances, transactions, and game history in one place.',
              },
              {
                icon: '📊',
                title: 'Analytics & Reports',
                body: 'Daily signup trends, cash game volume, deposit activity, and a player leaderboard — all with 30-day history.',
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-3 hover:bg-white/8 hover:border-indigo-700/40 transition-all"
              >
                <span className="text-3xl">{icon}</span>
                <h3 className="font-semibold text-white text-lg">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-8 py-20 border-t border-white/10 bg-white/3">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">From signing up to sitting at a live table in a few simple steps.</p>
          </div>
          <div className="flex flex-col gap-0">
            {[
              {
                step: '01',
                title: 'Sign up and verify',
                body: 'Players register via the mobile app using Google OAuth. Their account is instantly active and a wallet is created automatically.',
              },
              {
                step: '02',
                title: 'Add funds via Razorpay',
                body: 'Players deposit using the integrated Razorpay gateway. Funds land in their wallet after admin verification of the receipt.',
              },
              {
                step: '03',
                title: 'Pick a table and sit down',
                body: 'Browse available cash desks or practice tables. Choose a seat, set your buy-in, and you are live at the table in seconds.',
              },
              {
                step: '04',
                title: 'Play in real time',
                body: 'Every action — fold, call, raise, all-in — is processed by the engine and broadcast instantly to all players via Socket.IO.',
              },
              {
                step: '05',
                title: 'Cash out anytime',
                body: 'Leave the table and your balance returns to your wallet. Request a withdrawal to your bank account at any time.',
              },
            ].map(({ step, title, body }, i, arr) => (
              <div key={step} className="flex gap-6 relative">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shrink-0 z-10">
                    {step}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 bg-indigo-900/60 my-1"></div>
                  )}
                </div>
                <div className="pb-10">
                  <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Game modes ──────────────────────────────────────────────────── */}
      <section id="game-modes" className="px-8 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Two ways to play</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Whether you are a seasoned player or just learning the ropes, there is a table for you.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Cash */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800/60 border border-indigo-700/40 rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💰</span>
                <h3 className="text-xl font-bold">Cash Games</h3>
              </div>
              <ul className="flex flex-col gap-3 text-sm text-slate-300">
                {[
                  'Real money — buy in with your wallet balance',
                  'Configurable stakes, blinds, and seat limits',
                  'Up to 6 players per table',
                  'Leave anytime — balance returned to wallet',
                  'Full hand history archived for every game',
                  'Admin-managed tables and game modes',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Practice */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-white/10 rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎓</span>
                <h3 className="text-xl font-bold">Practice Mode</h3>
              </div>
              <ul className="flex flex-col gap-3 text-sm text-slate-300">
                {[
                  'No real money — play with virtual chips',
                  'Fill the table with AI bots instantly',
                  'Three difficulty levels: easy, medium, hard',
                  'Perfect for learning hand rankings and strategy',
                  'No deposit required — open to all players',
                  'Session stats tracked for your progress',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech stack ──────────────────────────────────────────────────── */}
      <section className="px-8 py-16 border-t border-white/10 bg-white/3">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Built on a modern, reliable stack</h2>
          <p className="text-slate-400 text-sm mb-10">Production-grade technologies chosen for performance, scalability, and developer clarity.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Next.js 14', 'TypeScript', 'MongoDB', 'Mongoose',
              'Socket.IO', 'Razorpay', 'Firebase Auth', 'Tailwind CSS',
              'Azure', 'GitHub Actions',
            ].map((tech) => (
              <span
                key={tech}
                className="bg-white/5 border border-white/10 text-slate-300 text-sm px-4 py-2 rounded-lg"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="px-8 py-24 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="flex gap-3 text-4xl select-none">
            <span>♠</span><span className="text-red-400">♥</span><span className="text-red-400">♦</span><span>♣</span>
          </div>
          <h2 className="text-4xl font-bold">Ready to take a seat?</h2>
          <p className="text-slate-400 text-lg max-w-xl">
            Manage your platform, monitor live games, and keep your players happy — all from one dashboard.
          </p>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-indigo-900/40"
          >
            {ctaLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-8 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-sm">
          <div className="flex items-center gap-2">
            <span>♠</span>
            <span>PokerApp</span>
          </div>
          <p>&copy; {new Date().getFullYear()} JDPC Global Pvt Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#features"     className="hover:text-slate-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-400 transition-colors">How It Works</a>
            <a href="#game-modes"   className="hover:text-slate-400 transition-colors">Game Modes</a>
            <Link href="/privacy"        className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms"          className="hover:text-slate-400 transition-colors">Terms of Service</Link>
            <Link href="/delete-account" className="hover:text-slate-400 transition-colors">Delete Account</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
