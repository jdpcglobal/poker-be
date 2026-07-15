import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service -- Poker 77',
  description: 'Terms and conditions governing your use of the Poker 77 app by JDPC Global.',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-sm bg-slate-900/80">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">♠</span>
          <span className="text-lg font-semibold tracking-wide">Poker 77</span>
        </Link>
        <Link href="/privacy-policy" className="text-sm text-slate-400 hover:text-white transition-colors">
          Privacy Policy
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-10">
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <div className="flex flex-wrap gap-6 text-sm text-slate-400">
            <span>Effective: July 14, 2026</span>
            <span>Last updated: July 14, 2026</span>
          </div>
        </div>

        <p className="text-slate-300 leading-relaxed mb-10">
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the{' '}
          <strong className="text-white">Poker 77</strong> mobile application (&quot;App&quot;) operated by{' '}
          <strong className="text-white">JDPC Global Pvt Ltd</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
          By downloading, installing, or using the App, you agree to be bound by these Terms.
          If you do not agree, do not use the App.
        </p>

        <div className="flex flex-col gap-10">

          <PolicySection title="1. Eligibility">
            <p className="text-slate-300 leading-relaxed mb-4">
              You must meet all of the following conditions to use this App:
            </p>
            <CheckList items={[
              'You are at least 18 years of age.',
              'Real-money gaming is legal in your state or jurisdiction under applicable Indian law.',
              'You are not located in a state where online skill-based gaming with prizes is prohibited (including Andhra Pradesh, Assam, Nagaland, Odisha, Sikkim, or Telangana).',
              'You are registering your own account and not acting on behalf of a third party.',
              'You have not been previously banned or suspended from the App.',
            ]} />
            <Callout>
              It is your responsibility to verify that participation is lawful in your jurisdiction.
              We reserve the right to restrict access to users from prohibited regions.
            </Callout>
          </PolicySection>

          <PolicySection title="2. Account Registration">
            <BulletList items={[
              'You may register using Google Sign-In or email and password, both powered by Firebase Authentication.',
              'You are responsible for maintaining the security of your account credentials.',
              'One account per person. Creating duplicate accounts is prohibited.',
              'You must provide accurate information. We reserve the right to terminate accounts with false details.',
              'You are responsible for all activity that occurs under your account.',
            ]} />
          </PolicySection>

          <PolicySection title="3. Real-Money Gaming">
            <p className="text-slate-300 leading-relaxed mb-4">
              Poker 77 offers real-money cash games. By participating, you acknowledge and agree that:
            </p>
            <BulletList items={[
              'Cash games involve actual money deposited into your in-app wallet.',
              'Poker is a game of skill. Outcomes depend on player decisions, hand strength, and game strategy.',
              'You may win or lose real money. Past performance does not guarantee future results.',
              'Winnings are subject to applicable TDS (Tax Deducted at Source) as per Indian income tax law.',
              'The Company does not guarantee any minimum winnings or returns.',
              'Practice mode chips are virtual, have no monetary value, and cannot be exchanged for real money.',
            ]} />
          </PolicySection>

          <PolicySection title="4. Deposits and Withdrawals">
            <SubHeading>Deposits</SubHeading>
            <BulletList items={[
              'Deposits are processed via Razorpay. Supported methods include UPI, debit/credit cards, and net banking.',
              'All deposits are subject to applicable GST as per prevailing Indian tax regulations.',
              'Deposited funds are credited to your in-app wallet after successful payment confirmation.',
              'Deposits are non-refundable once credited and used in gameplay.',
            ]} />
            <SubHeading>Withdrawals</SubHeading>
            <BulletList items={[
              'Withdrawal requests require a verified bank account linked to your profile.',
              'Withdrawals are subject to admin review and are processed within 3--5 business days.',
              'TDS will be deducted on net winnings exceeding the threshold specified under applicable law.',
              'We reserve the right to withhold withdrawals pending verification or in cases of suspected fraud.',
            ]} />
          </PolicySection>

          <PolicySection title="5. Fair Play and Prohibited Conduct">
            <p className="text-slate-300 leading-relaxed mb-4">
              To maintain a fair environment, the following are strictly prohibited:
            </p>
            <BulletList items={[
              'Collusion or coordination with other players to gain an unfair advantage.',
              'Use of bots, scripts, automation tools, or any artificial intelligence to play on your behalf.',
              'Chip dumping (intentionally losing chips to transfer funds to another account).',
              'Exploiting software bugs or vulnerabilities. Any such discovery must be reported to us immediately.',
              'Creating multiple accounts to claim bonuses or circumvent restrictions.',
              'Any form of harassment, abusive language, or inappropriate behaviour toward other users.',
            ]} />
            <Callout>
              Violation of fair-play rules may result in immediate account suspension and forfeiture
              of all wallet balances.
            </Callout>
          </PolicySection>

          <PolicySection title="6. Bonuses and Promotions">
            <BulletList items={[
              'A signup bonus is credited to all new accounts on first registration.',
              'Bonus amounts are at our sole discretion and may be modified or withdrawn at any time.',
              'Bonuses are subject to wagering requirements before they can be withdrawn.',
              'We reserve the right to reclaim bonuses obtained through fraudulent means.',
              'Promotional terms, if any, will be communicated separately within the App.',
            ]} />
          </PolicySection>

          <PolicySection title="7. Responsible Gaming">
            <p className="text-slate-300 leading-relaxed mb-4">
              We are committed to promoting responsible gaming. We encourage you to:
            </p>
            <CheckList items={[
              'Set personal deposit and session limits.',
              'Take regular breaks and avoid extended gaming sessions.',
              'Never play with money you cannot afford to lose.',
              'Seek help if you feel you may have a gambling problem.',
            ]} />
            <p className="text-slate-300 text-sm mt-5">
              If you wish to self-exclude or limit your account, contact us at{' '}
              <a href="mailto:info@jdpcglobal.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                info@jdpcglobal.com
              </a>.
            </p>
          </PolicySection>

          <PolicySection title="8. Intellectual Property">
            <p className="text-slate-300 leading-relaxed">
              All content within the App -- including but not limited to software, graphics, game
              logic, branding, and text -- is the exclusive property of JDPC Global Pvt Ltd or its
              licensors. You may not copy, modify, distribute, reverse-engineer, or create derivative
              works from any part of the App without our prior written consent.
            </p>
          </PolicySection>

          <PolicySection title="9. Disclaimers and Limitation of Liability">
            <BulletList items={[
              'The App is provided "as is" without warranty of any kind, express or implied.',
              'We do not guarantee uninterrupted or error-free service.',
              'We are not liable for any loss of funds arising from technical failures, connectivity issues, or force majeure events.',
              'Our total liability to you under any circumstance shall not exceed the amount deposited by you in the 30 days preceding the claim.',
              'We are not responsible for third-party services (Razorpay, Firebase, AdMob) used within the App.',
            ]} />
          </PolicySection>

          <PolicySection title="10. Account Termination">
            <p className="text-slate-300 leading-relaxed mb-4">
              We reserve the right to suspend or terminate your account at our discretion if:
            </p>
            <BulletList items={[
              'You violate these Terms or our fair-play policies.',
              'We detect fraudulent, abusive, or illegal activity.',
              'You are found to be ineligible under Section 1 (Eligibility).',
              'Your account has been inactive for more than 12 consecutive months.',
            ]} />
            <p className="text-slate-300 text-sm mt-4">
              On termination for cause, we may forfeit your wallet balance. On termination without
              cause, we will refund any remaining withdrawable balance within 14 business days.
            </p>
          </PolicySection>

          <PolicySection title="11. Governing Law and Disputes">
            <p className="text-slate-300 leading-relaxed mb-4">
              These Terms are governed by the laws of India. Any dispute arising out of or in
              connection with these Terms shall be subject to:
            </p>
            <BulletList items={[
              'First, good-faith negotiation between the parties.',
              'If unresolved within 30 days, binding arbitration under the Arbitration and Conciliation Act, 1996.',
              'The seat of arbitration shall be Jaipur, Rajasthan, India.',
              'The language of arbitration shall be English.',
            ]} />
          </PolicySection>

          <PolicySection title="12. Changes to These Terms">
            <p className="text-slate-300 leading-relaxed">
              We may update these Terms at any time. We will notify you of material changes via an
              in-app notice. Your continued use of the App after the updated Terms take effect
              constitutes your acceptance. If you do not agree to the revised Terms, you must stop
              using the App and contact us to close your account.
            </p>
          </PolicySection>

          <PolicySection title="13. Contact Us">
            <p className="text-slate-300 leading-relaxed mb-5">
              For any questions, disputes, or requests related to these Terms:
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
            <Link href="/privacy-policy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms-&-conditions" className="text-indigo-400">Terms of Service</Link>
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
