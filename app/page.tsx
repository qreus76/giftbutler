import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "GiftButler — No more guessing. Just the right gift.",
  description: "Drop hints. Share your link. Get gifts you actually want.",
  openGraph: {
    title: "GiftButler — No more guessing. Just the right gift.",
    description: "Drop hints. Share your link. Get gifts you actually want.",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GiftButler — No more guessing. Just the right gift." }],
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
};

async function getProfileCount(): Promise<number> {
  const { count } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
  return count || 0;
}

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  const profileCount = await getProfileCount();

  const returnUrl = "/home";

  return (
    <main className="min-h-screen bg-white">

      {/* ── MOBILE ── */}
      <div className="page-fullbleed lg:hidden">
        <img src="/present_giving.png" alt="Someone giving a gift" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.82) 100%)" }} />

        <div className="absolute top-0 left-0 right-0 px-6" style={{ paddingTop: "max(48px, env(safe-area-inset-top, 48px))" }}>
          <span className="text-xl font-bold text-white tracking-tight">GiftButler</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6" style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom, 40px))" }}>
          <h1 className="text-3xl font-bold text-white leading-tight mb-2">
            No more guessing.<br />Just the right gift.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-1">
            Drop hints. Share your link. Get gifts you actually want.
          </p>
          {profileCount >= 50 && (
            <p className="text-white/50 text-xs font-semibold mb-5">{profileCount.toLocaleString()} people have set up their profile</p>
          )}
          {profileCount < 50 && <div className="mb-5" />}

          <div className="flex flex-col gap-2.5">
            {isSignedIn ? (
              <Link href={returnUrl} className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-center text-base transition-colors">
                Open GiftButler →
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-center text-base transition-colors">
                  Create my free profile
                </Link>
                <Link href="/sign-in" className="w-full py-3.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-full text-center text-base transition-colors backdrop-blur-sm border border-white/20">
                  Sign in
                </Link>
              </>
            )}
          </div>
          <p className="text-center text-xs text-white/30 mt-4">Free forever · No credit card</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/20">
            <Link href="/privacy" className="hover:text-white/50">Privacy</Link>
            <Link href="/terms" className="hover:text-white/50">Terms</Link>
          </div>
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
        <div className="relative overflow-hidden">
          <img src="/present_giving.png" alt="Someone giving a gift" className="w-full h-full object-cover absolute inset-0" />
        </div>

        <div className="flex flex-col items-center justify-center px-16 py-16 bg-[#EAEAE0]">
          <div className="w-full max-w-sm">
            <h1 className="text-4xl font-bold text-[#111111] mb-2 text-center">GiftButler</h1>
            <p className="text-[#888888] text-sm text-center mb-10">No more guessing. Just the right gift.</p>

            {profileCount >= 50 && (
              <p className="text-xs text-[#888888] text-center mb-6">{profileCount.toLocaleString()} people have set up their profile</p>
            )}

            <div className="flex flex-col gap-3">
              {isSignedIn ? (
                <Link href={returnUrl} className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-center text-sm transition-colors">
                  Open GiftButler →
                </Link>
              ) : (
                <>
                  <Link href="/sign-up" className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-center text-sm transition-colors">
                    Create my free profile
                  </Link>
                  <Link href="/sign-in" className="w-full py-3.5 bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-center text-sm transition-colors">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <p className="text-center text-xs text-[#888888] mt-4">Free forever · No credit card</p>
            <div className="flex items-center justify-center gap-4 mt-12 text-xs text-[#CCCCCC]">
              <Link href="/privacy" className="hover:text-[#888888]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#888888]">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
