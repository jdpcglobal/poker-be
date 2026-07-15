import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy -- Poker 77',
  description: 'How JDPC Global collects, uses, and protects your data in the Poker 77 app.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-sm bg-slate-900/80">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">♠</span>
          <span className="text-lg font-semibold tracking-wide">Poker 77</span>
        </Link>
        <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
          Terms of Service
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-10">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <div className="flex flex-wrap gap-6 text-sm text-slate-400">
            <span>Effective: July 14, 2026</span>
            <span>Last updated: July 14, 2026</span>
          </div>
        </div>

        <p className="text-slate-300 leading-relaxed mb-10">
          This Privacy Policy explains how <strong className="text-white">JDPC Global Pvt Ltd</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
          collects, uses, and protects your information when you use the <strong className="text-white">Poker 77</strong> mobile
          application (&quot;App&quot;), available on Google Play. By using the App, you agree to the terms
          of this Privacy Policy.
        </p>

        <div className="flex flex-col gap-10">

          <PolicySection title="1. Data We Collect">
            <SubHeading>a) Personal Information</SubHeading>
            <p className="text-slate-300 leading-relaxed mb-4">
              When you sign in via Google or email, we access the following information solely to
              identify your player profile within the App:
            </p>
            <BulletList items={[
              'Your account ID (Google Account ID or Firebase UID)',
              'Display name or username',
              'Email address',
              'Profile picture (Google sign-in only, optional)',
            ]} />
            <Callout>We do not share, sell, or rent this data to any third party.</Callout>

            <SubHeading>b) Non-Personal Usage Data</SubHeading>
            <p className="text-slate-300 leading-relaxed mb-3">
              We may collect limited anonymised usage data to improve the App:
            </p>
            <BulletList items={[
              "Game mode preferences (Texas Hold'em or Omaha)",
              'Number of games played',
              'Device type and OS version',
              'Crash and performance reports',
            ]} />
          </PolicySection>

          <PolicySection title="2. How We Use Your Data">
            <CheckList items={[
              'To create and maintain your player account and wallet.',
              'To process deposits and withdrawals through our payment gateway.',
              'To display your username and game history within the App.',
              'To investigate abuse, fraud, or security incidents.',
              'To comply with applicable legal and regulatory obligations.',
            ]} />
          </PolicySection>

          <PolicySection title="3. Gameplay and Features">
            <BulletList items={[
              'This is a real-money poker platform. Cash games involve actual funds held in your in-app wallet.',
              'Practice mode uses virtual chips only -- these have no monetary value and cannot be withdrawn.',
              'You may play against other real users or system-controlled bots.',
              'You can earn bonus chips through gameplay or by watching rewarded video ads (powered by third-party ad networks -- see Section 4).',
            ]} />
          </PolicySection>

          <PolicySection title="4. Third-Party Services">
            <p className="text-slate-300 leading-relaxed mb-4">
              The following third-party services may collect limited device or advertising data in
              accordance with their own privacy policies:
            </p>
            <div className="flex flex-col gap-4 mb-5">
              {[
                {
                  name: 'Google AdMob',
                  desc: 'Powers rewarded video ads. May use Android Advertising ID for non-personalised ad targeting or frequency capping.',
                  link: 'https://support.google.com/admob/answer/6128543',
                  linkLabel: 'AdMob Privacy Policy',
                },
                {
                  name: 'Google Play Services',
                  desc: 'Used for sign-in and analytics.',
                  link: 'https://policies.google.com/privacy',
                  linkLabel: 'Google Privacy Policy',
                },
                {
                  name: 'Razorpay',
                  desc: 'Processes deposit transactions. Razorpay handles payment data under its own PCI-DSS compliant infrastructure.',
                  link: 'https://razorpay.com/privacy/',
                  linkLabel: 'Razorpay Privacy Policy',
                },
              ].map(({ name, desc, link, linkLabel }) => (
                <div key={name} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="font-semibold text-white mb-1">{name}</p>
                  <p className="text-slate-400 text-sm mb-2">{desc}</p>
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
                    {linkLabel} ↗
                  </a>
                </div>
              ))}
            </div>
            <Callout>We do not allow personalised ads based on sensitive user data.</Callout>
          </PolicySection>

          <PolicySection title="5. Data Sharing and Retention">
            <BulletList items={[
              'We do not share, sell, or rent any personal or gameplay data to third parties.',
              'Your sign-in credentials are stored securely and used only for authentication.',
              'Financial transaction records are retained for the period required under applicable Indian tax and financial regulations.',
              'Non-financial usage data is retained only as long as needed to maintain App functionality.',
              'If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.',
            ]} />
          </PolicySection>

          <PolicySection title="6. Data Security">
            <p className="text-slate-300 leading-relaxed">
              We use reasonable administrative, technical, and physical safeguards to protect your
              data from unauthorised access, alteration, disclosure, or destruction. All data in
              transit is encrypted via HTTPS/TLS. However, no app or online service can guarantee
              100% security, and you use the App at your own risk.
            </p>
          </PolicySection>

          <PolicySection title="7. Children's Privacy">
            <p className="text-slate-300 leading-relaxed">
              This App is intended for users aged <strong className="text-white">18 and above</strong>. Real-money gaming is
              restricted to adults under applicable Indian law. We do not knowingly collect personal
              information from anyone under 18. If you believe we have unintentionally collected
              such data, please contact us immediately and we will remove it promptly.
            </p>
          </PolicySection>

          <PolicySection title="8. Your Rights and Choices">
            <p className="text-slate-300 leading-relaxed mb-4">You may, at any time:</p>
            <CheckList items={[
              'Request a copy of the personal data we hold about you.',
              'Request correction of inaccurate data.',
              'Request deletion of your account and associated personal data.',
              'Withdraw Google or email sign-in access via your device settings.',
              'Disable ad personalisation in your Google account settings.',
            ]} />
            <p className="text-slate-300 text-sm mt-5">
              To submit any request, email us at{' '}
              <a href="mailto:info@jdpcglobal.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                info@jdpcglobal.com
              </a>.
            </p>
          </PolicySection>

          <PolicySection title="9. Changes to This Policy">
            <p className="text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our
              practices or for legal, regulatory, or operational reasons. Material changes will be
              communicated via an in-app notice or an update log. Your continued use of the App
              after the effective date of any update constitutes your acceptance of the revised policy.
            </p>
          </PolicySection>

          <PolicySection title="10. Contact Us">
            <p className="text-slate-300 leading-relaxed mb-5">
              If you have any questions, concerns, or requests related to this Privacy Policy,
              please contact us:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-2 text-sm text-slate-300">
              <p><strong className="text-white">JDPC Global Pvt Ltd</strong></p>
              <p>Jaipur, Rajasthan, India</p>
              <a href="mailto:info@jdpcglobal.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                info@jdpcglobal.com
              </a>
            </div>
          </PolicySection>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-8 mt-10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-sm">
          <Link href="/" className="flex items-center gap-2 hover:text-slate-400 transition-colors">
            <span>♠</span>
            <span>Poker 77</span>
          </Link>
          <p>&copy; {new Date().getFullYear()} JDPC Global Pvt Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-indigo-400">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white mb-4 pb-3 border-b border-white/10">{title}</h2>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-200 mb-3 mt-5">{children}</h3>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-slate-300 text-sm">
          <span className="text-indigo-400 mt-1 shrink-0">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-slate-300 text-sm">
          <span className="text-indigo-400 mt-1 shrink-0">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 bg-indigo-900/30 border border-indigo-700/40 rounded-lg px-4 py-3 text-sm text-indigo-200">
      {children}
    </div>
  );
}
