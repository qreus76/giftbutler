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

      {/* ── MOBILE LAYOUT ── */}
      <div className="flex flex-col min-h-screen lg:hidden">

        {/* Logo */}
        <div className="flex justify-center pt-10 pb-6 px-6">
          <span className="text-3xl font-black text-stone-900 tracking-tight">GiftButler</span>
        </div>

        {/* Hero image placeholder */}
        <div className="mx-6 rounded-3xl overflow-hidden bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center"
          style={{ minHeight: "280px" }}>
          {/* Replace this div with your <img> or <Image> once you have a photo */}
          <div className="text-center px-6 py-10">
            <p className="text-4xl mb-3">🎁</p>
            <p className="text-sm font-medium text-amber-600">Your image goes here</p>
            <p className="text-xs text-stone-400 mt-1">Warm, real, personal — a gift moment</p>
          </div>
        </div>

        {/* Copy + CTA */}
        <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
          <h1 className="text-3xl font-black text-stone-900 leading-tight mb-3">
            The gift guide<br />they made themselves.
          </h1>
          <p className="text-stone-500 text-base leading-relaxed mb-2">
            Drop hints. Share your link. Get gifts you actually want.
          </p>
          {profileCount > 1 && (
            <p className="text-xs font-semibold text-amber-600 mb-8">
              {profileCount.toLocaleString()} people have set up their profile
            </p>
          )}
          {!profileCount || profileCount <= 1 && (
            <div className="mb-8" />
          )}

          <div className="flex flex-col gap-3 mt-auto">
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
                  className="w-full py-4 border border-stone-200 hover:border-stone-300 text-stone-600 font-semibold rounded-2xl text-center text-base transition-colors">
                  Sign in
                </Link>
              </>
            )}
          </div>

          <p className="text-center text-xs text-stone-400 mt-4">Free forever · No credit card</p>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">

        {/* Left — image */}
        <div className="relative bg-amber-50 border-r-2 border-dashed border-amber-200 flex items-center justify-center">
          {/* Replace this div with your <img> or <Image> once you have a photo */}
          <div className="text-center px-12">
            <p className="text-6xl mb-4">🎁</p>
            <p className="text-base font-medium text-amber-600">Your image goes here</p>
            <p className="text-sm text-stone-400 mt-1">Warm, real, personal — a gift moment</p>
          </div>
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
            {profileCount > 1 && (
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
