import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: "/present_giving.png",
        width: 1200,
        height: 1600,
        alt: "GiftButler — No more guessing. Just the right gift.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/present_giving.png"],
  },
};

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

  let profileUsername: string | null = null;
  if (userId) {
    const { data } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).single();
    profileUsername = data?.username || null;
  }
  const returnUrl = profileUsername ? `/for/${profileUsername}` : "/activity";

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

        {/* Gradient overlay — wine-tinted, transparent top, rich bottom */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(107,36,55,0.1) 0%, rgba(74,24,40,0.65) 55%, rgba(26,8,16,0.92) 100%)"
        }} />

        {/* Logo — top left, respects safe area */}
        <div className="absolute top-0 left-0 right-0 px-6" style={{ paddingTop: "max(48px, env(safe-area-inset-top, 48px))" }}>
          <span className="text-xl font-display text-white drop-shadow-sm">GiftButler</span>
        </div>

        {/* Content pinned to bottom, respects safe area */}
        <div className="absolute bottom-0 left-0 right-0 px-6" style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom, 40px))" }}>
          <h1 className="text-3xl font-display text-white leading-tight mb-2">
            No more guessing.<br />Just the right gift.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-1">
            Drop hints. Share your link. Get gifts you actually want.
          </p>
          {profileCount >= 50 && (
            <p className="text-[#F0D090] text-xs font-semibold mb-5">
              {profileCount.toLocaleString()} people have set up their profile
            </p>
          )}
          {profileCount < 50 && <div className="mb-5" />}

          <div className="flex flex-col gap-3">
            {isSignedIn ? (
              <Link href={returnUrl}
                className="w-full py-4 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-bold rounded-2xl text-center text-base transition-colors">
                View my profile →
              </Link>
            ) : (
              <>
                <Link href="/sign-up"
                  className="w-full py-4 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-bold rounded-2xl text-center text-base transition-colors">
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
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/25">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">

        {/* Left — image */}
        <div className="relative overflow-hidden">
          <img src="/present_giving.png" alt="Someone giving a gift" className="w-full h-full object-cover absolute inset-0" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, rgba(250,244,236,0.3) 100%)" }} />
        </div>

        {/* Right — logo + CTA */}
        <div className="flex flex-col items-center justify-center px-16 py-16 bg-[#FAF4EC]">
          <div className="w-full max-w-sm">

            {/* Logo */}
            <h1 className="text-4xl font-display text-[#6B2437] mb-2 text-center">
              GiftButler
            </h1>
            <p className="text-[#7A6A5E] text-sm text-center mb-10">
              No more guessing. Just the right gift.
            </p>

            {/* Social proof */}
            {profileCount >= 50 && (
              <p className="text-xs font-semibold text-[#C08A3C] text-center mb-6">
                {profileCount.toLocaleString()} people have set up their profile
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              {isSignedIn ? (
                <Link href={returnUrl}
                  className="w-full py-3.5 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-bold rounded-2xl text-center text-sm transition-colors">
                  View my profile →
                </Link>
              ) : (
                <>
                  <Link href="/sign-up"
                    className="w-full py-3.5 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-bold rounded-2xl text-center text-sm transition-colors">
                    Create my free profile
                  </Link>
                  <Link href="/sign-in"
                    className="w-full py-3.5 border-2 border-[#E5D9CC] hover:border-[#6B2437] text-[#7A6A5E] hover:text-[#6B2437] font-semibold rounded-2xl text-center text-sm transition-colors">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <p className="text-center text-xs text-[#7A6A5E] mt-4">Free forever · No credit card</p>

            {/* Footer links */}
            <div className="flex items-center justify-center gap-4 mt-12 text-xs text-[#E5D9CC]">
              <Link href="/privacy" className="hover:text-[#7A6A5E] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[#7A6A5E] transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
