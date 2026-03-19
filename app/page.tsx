import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getProfileCount(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true });
  return count || 0;
}

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  const profileCount = await getProfileCount();

  return (
    <main className="min-h-screen bg-white">

      {/* ── MOBILE LAYOUT — full bleed image with overlay ── */}
      <div className="page-fullbleed lg:hidden">

        {/* Full bleed image */}
        <img
          src="/present_giving.png"
          alt="Someone giving a gift"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />

        {/* Gradient overlay — transparent top, dark bottom */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)"
        }} />

        {/* Logo — top left, respects safe area */}
        <div className="absolute top-0 left-0 right-0 px-6" style={{ paddingTop: "max(48px, env(safe-area-inset-top, 48px))" }}>
          <span className="text-xl font-black text-white tracking-tight drop-shadow-sm">GiftButler</span>
        </div>

        {/* Content pinned to bottom, respects safe area */}
        <div className="absolute bottom-0 left-0 right-0 px-6" style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom, 40px))" }}>
          <h1 className="text-3xl font-black text-white leading-tight mb-2">
            The gift guide<br />they made themselves.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-1">
            Drop hints. Share your link. Get gifts you actually want.
          </p>
          {profileCount >= 50 && (
            <p className="text-amber-300 text-xs font-semibold mb-5">
              {profileCount.toLocaleString()} people have set up their profile
            </p>
          )}
          {profileCount < 50 && <div className="mb-5" />}

          <div className="flex flex-col gap-3">
            {isSignedIn ? (
              <Link href="/dashboard"
                className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-center text-base transition-colors">
                Go to my profile →
              </Link>
            ) : (
              <>
                <Link href="/sign-up"
                  className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-center text-base transition-colors">
                  Create my free profile
                </Link>
                <Link href="/sign-in"
                  className="w-full py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-2xl text-center text-base transition-colors backdrop-blur-sm">
                  Sign in
                </Link>
              </>
            )}
          </div>
          <p className="text-center text-xs text-white/40 mt-4">Free forever · No credit card</p>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">

        {/* Left — image */}
        <div className="relative overflow-hidden">
          <img src="/present_giving.png" alt="Someone giving a gift" className="w-full h-full object-cover absolute inset-0" />
        </div>

        {/* Right — logo + CTA */}
        <div className="flex flex-col items-center justify-center px-16 py-16">
          <div className="w-full max-w-sm">

            {/* Logo */}
            <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-2 text-center">
              GiftButler
            </h1>
            <p className="text-stone-400 text-sm text-center mb-10">
              The gift guide they made themselves.
            </p>

            {/* Social proof */}
            {profileCount >= 50 && (
              <p className="text-xs font-semibold text-amber-600 text-center mb-6">
                {profileCount.toLocaleString()} people have set up their profile
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              {isSignedIn ? (
                <Link href="/dashboard"
                  className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-center text-sm transition-colors">
                  Go to my profile →
                </Link>
              ) : (
                <>
                  <Link href="/sign-up"
                    className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-center text-sm transition-colors">
                    Create my free profile
                  </Link>
                  <Link href="/sign-in"
                    className="w-full py-3.5 border border-stone-200 hover:border-stone-300 text-stone-600 font-semibold rounded-2xl text-center text-sm transition-colors">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <p className="text-center text-xs text-stone-400 mt-4">Free forever · No credit card</p>

            {/* Minimal footer links */}
            <div className="flex items-center justify-center gap-4 mt-12 text-xs text-stone-300">
              <Link href="/explore" className="hover:text-stone-500 transition-colors">Explore</Link>
              <Link href="/privacy" className="hover:text-stone-500 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-stone-500 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile footer */}
      <div className="lg:hidden flex items-center justify-center gap-4 py-4 text-xs text-stone-300 border-t border-stone-100">
        <Link href="/explore" className="hover:text-stone-500 transition-colors">Explore</Link>
        <Link href="/privacy" className="hover:text-stone-500 transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-stone-500 transition-colors">Terms</Link>
      </div>

    </main>
  );
}
