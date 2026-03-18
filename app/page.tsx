import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-xl font-bold text-stone-900">GiftButler</span>
        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <>
              <Link href="/sign-in" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Sign in</Link>
              <Link href="/sign-up" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">Get started free</Link>
            </>
          ) : (
            <Link href="/dashboard" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">My profile</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">Free forever for everyone</div>
        <h1 className="text-5xl font-bold text-stone-900 leading-tight mb-6">
          Stop answering<br />&ldquo;what do you want?&rdquo;
        </h1>
        <p className="text-xl text-stone-500 mb-10 leading-relaxed">
          Drop hints about your life. Share your link.<br />
          The people who love you will always know exactly what to get.
        </p>
        {!isSignedIn ? (
          <Link href="/sign-up" className="inline-block px-8 py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-lg transition-colors shadow-sm">
            Create your free profile →
          </Link>
        ) : (
          <Link href="/dashboard" className="inline-block px-8 py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-lg transition-colors shadow-sm">
            Go to my profile →
          </Link>
        )}
        <p className="text-stone-400 text-sm mt-4">No credit card. No paywall. Ever.</p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-stone-50 rounded-2xl p-6">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-bold text-stone-900 mb-2">Drop hints</h3>
            <p className="text-stone-500 text-sm leading-relaxed">Tell GiftButler what you&apos;re into, dreaming about, or need. As casual as texting a friend.</p>
          </div>
          <div className="bg-stone-50 rounded-2xl p-6">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="font-bold text-stone-900 mb-2">Share your link</h3>
            <p className="text-stone-500 text-sm leading-relaxed">When someone asks &ldquo;what do you want?&rdquo; — send them your GiftButler link. Done.</p>
          </div>
          <div className="bg-stone-50 rounded-2xl p-6">
            <div className="text-3xl mb-3">🎁</div>
            <h3 className="font-bold text-stone-900 mb-2">Get perfect gifts</h3>
            <p className="text-stone-500 text-sm leading-relaxed">The AI reads your hints and gives buyers specific, thoughtful ideas. No more generic gifts.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 py-6 text-center text-stone-400 text-sm">
        GiftButler — Free for everyone, always.
      </footer>
    </main>
  );
}
