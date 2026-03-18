import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — GiftButler",
  description: "How GiftButler collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  const updated = "March 18, 2026";

  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto border-b border-stone-100">
        <Link href="/" className="text-xl font-bold text-stone-900">GiftButler</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Privacy Policy</h1>
        <p className="text-stone-400 text-sm mb-10">Last updated: {updated}</p>

        <div className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">What we collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Account information</strong> — your email address and, optionally, your name and profile photo, provided when you sign up via Clerk.</li>
              <li><strong>Profile information</strong> — your username, display name, bio, and birthday (if you choose to add them).</li>
              <li><strong>Hints</strong> — the content you write on your gift profile.</li>
              <li><strong>Visit data</strong> — we record when your profile is viewed (IP address, timestamp) to show you a visit count. We do not identify individual visitors.</li>
              <li><strong>Gift claims</strong> — when someone clicks "I&apos;m getting this," we record the gift description and occasion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">How we use it</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>To operate your gift profile and show it to people you share your link with.</li>
              <li>To send you email notifications when someone visits your profile or claims a gift (you can stop using the service to stop receiving these).</li>
              <li>To generate AI-powered gift recommendations using the hints on your profile.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Third-party services</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Clerk</strong> — handles authentication and stores your email address. <a href="https://clerk.com/privacy" className="text-amber-600 hover:underline" target="_blank" rel="noopener noreferrer">Clerk Privacy Policy</a></li>
              <li><strong>Supabase</strong> — stores your profile data, hints, and visit records. <a href="https://supabase.com/privacy" className="text-amber-600 hover:underline" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
              <li><strong>Resend</strong> — delivers notification emails. <a href="https://resend.com/privacy" className="text-amber-600 hover:underline" target="_blank" rel="noopener noreferrer">Resend Privacy Policy</a></li>
              <li><strong>Anthropic Claude</strong> — processes your hints to generate gift recommendations. Hints are sent to the Claude API but are not used to train models. <a href="https://www.anthropic.com/privacy" className="text-amber-600 hover:underline" target="_blank" rel="noopener noreferrer">Anthropic Privacy Policy</a></li>
              <li><strong>Amazon Associates</strong> — gift recommendation links are Amazon affiliate links. As an Amazon Associate, GiftButler earns from qualifying purchases. Clicking these links may set cookies on Amazon&apos;s site. <a href="https://www.amazon.com/gp/help/customer/display.html?nodeId=468496" className="text-amber-600 hover:underline" target="_blank" rel="noopener noreferrer">Amazon Privacy Notice</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Data sharing</h2>
            <p className="text-sm">We do not sell your personal data. We do not share it with third parties except the service providers listed above, which are necessary to operate GiftButler.</p>
            <p className="text-sm mt-2">Your hints and profile are public by default — that&apos;s the point of the service. Only share hints you&apos;re comfortable with anyone seeing.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Your rights</h2>
            <p className="text-sm">You can delete your hints at any time from your dashboard. To delete your account and all associated data, email us at <a href="mailto:privacy@giftbutler.io" className="text-amber-600 hover:underline">privacy@giftbutler.io</a> and we will remove it within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-3">Contact</h2>
            <p className="text-sm">Questions? <a href="mailto:privacy@giftbutler.io" className="text-amber-600 hover:underline">privacy@giftbutler.io</a></p>
          </section>

        </div>
      </div>

      <footer className="border-t border-stone-100 py-6 text-center text-stone-400 text-sm mt-8 space-x-4">
        <Link href="/" className="hover:text-stone-600">← Back to GiftButler</Link>
        <Link href="/terms" className="hover:text-stone-600 underline">Terms of Service</Link>
      </footer>
    </main>
  );
}
