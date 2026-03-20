import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata: Metadata = {
  openGraph: {
    images: [{ url: "/present_giving.png", width: 1200, height: 1600, alt: "GiftButler — No more guessing. Just the right gift." }],
  },
  twitter: { card: "summary_large_image", images: ["/present_giving.png"] },
};

async function getProfileCount(): Promise<number> {
  const { count } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
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

      {/* ── MOBILE ── */}
      <div className="page-fullbleed lg:hidden">
        <img src="/present_giving.png" alt="Someone giving a gift" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.85) 100%)" }} />

        <div className="absolute top-0 left-0 right-0 px-6" style={{ paddingTop: "max(48px, env(safe-area-inset-top, 48px))" }}>
          <span className="text-xl font-bold text-[#FF9900] tracking-tight">GiftButler</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6" style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom, 40px))" }}>
          <h1 className="text-3xl font-bold text-white leading-tight mb-2">
            No more guessing.<br />Just the right gift.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-1">
            Drop hints. Share your link. Get gifts you actually want.
          </p>
          {profileCount >= 50 && (
            <p className="text-[#FF9900] text-xs font-semibold mb-5">{profileCount.toLocaleString()} people have set up their profile</p>
          )}
          {profileCount < 50 && <div className="mb-5" />}

          <div className="flex flex-col gap-2.5">
            {isSignedIn ? (
              <Link href={returnUrl} className="w-full py-3.5 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-center text-base transition-colors">
                View my profile →
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className="w-full py-3.5 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-center text-base transition-colors">
                  Create my free profile
                </Link>
                <Link href="/sign-in" className="w-full py-3.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-full text-center text-base transition-colors backdrop-blur-sm">
                  Sign in
                </Link>
              </>
            )}
          </div>
          <p className="text-center text-xs text-white/40 mt-4">Free forever · No credit card</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/25">
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

        <div className="flex flex-col items-center justify-center px-16 py-16 bg-[#EAEDED]">
          <div className="w-full max-w-sm">
            <h1 className="text-4xl font-bold text-[#FF9900] mb-2 text-center">GiftButler</h1>
            <p className="text-[#565959] text-sm text-center mb-10">No more guessing. Just the right gift.</p>

            {profileCount >= 50 && (
              <p className="text-xs font-semibold text-[#FF9900] text-center mb-6">{profileCount.toLocaleString()} people have set up their profile</p>
            )}

            <div className="flex flex-col gap-3">
              {isSignedIn ? (
                <Link href={returnUrl} className="w-full py-3 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-center text-sm transition-colors">
                  View my profile →
                </Link>
              ) : (
                <>
                  <Link href="/sign-up" className="w-full py-3 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-center text-sm transition-colors">
                    Create my free profile
                  </Link>
                  <Link href="/sign-in" className="w-full py-3 bg-white border border-[#D5D9D9] hover:bg-[#D5D9D9] text-[#0F1111] font-semibold rounded-full text-center text-sm transition-colors">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <p className="text-center text-xs text-[#565959] mt-4">Free forever · No credit card</p>
            <div className="flex items-center justify-center gap-4 mt-12 text-xs text-[#D5D9D9]">
              <Link href="/privacy" className="hover:text-[#565959]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#565959]">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
