import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { MessageCircle, Link2, Gift, Sparkles, Check } from "lucide-react";
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
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-xl font-bold text-stone-900">GiftButler</span>
        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <>
              <Link href="/sign-in" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">Sign in</Link>
              <Link href="/sign-up" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">Get started free →</Link>
            </>
          ) : (
            <Link href="/dashboard" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">My profile →</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        {profileCount > 0 && (
          <div className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
            {profileCount.toLocaleString()} gift profiles created · Free forever
          </div>
        )}
        <h1 className="text-5xl font-bold text-stone-900 leading-tight mb-4">
          Stop answering<br />&ldquo;what do you want?&rdquo;
        </h1>
        <p className="text-xl text-stone-500 mb-3 leading-relaxed">
          Create a free gift profile. Drop hints about what you love.<br />
          Share your link — and the people who love you will always know exactly what to get.
        </p>
        <p className="text-sm text-amber-600 font-semibold mb-8">It takes 2 minutes. Free forever.</p>
        {!isSignedIn ? (
          <Link href="/sign-up" className="inline-block px-8 py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-lg transition-colors shadow-sm">
            Create my free profile →
          </Link>
        ) : (
          <Link href="/dashboard" className="inline-block px-8 py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-lg transition-colors shadow-sm">
            Go to my profile →
          </Link>
        )}
        <p className="text-stone-400 text-sm mt-4">No credit card. No paywall. Ever.</p>
      </section>

      {/* Live demo mockup */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <p className="text-center text-xs font-semibold text-stone-400 uppercase tracking-widest mb-6">Here&apos;s what your profile looks like to someone shopping for you</p>
        <div className="bg-stone-50 rounded-3xl p-6 md:p-8 border border-stone-200">
          <div className="grid md:grid-cols-2 gap-6">

            {/* Left: the profile */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Your gift profile</p>
              <div className="bg-white rounded-2xl p-5 border border-stone-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-sm font-bold text-stone-900">S</div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Sarah</p>
                    <p className="text-stone-400 text-xs">@sarah · 🎂 Birthday in 18 days</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Into lately", color: "bg-amber-100 text-amber-700", text: "I've been obsessed with sourdough baking lately" },
                    { label: "Want", color: "bg-blue-100 text-blue-600", text: "A good Dutch oven — been putting it off forever" },
                    { label: "Dream", color: "bg-purple-100 text-purple-600", text: "A weekend trip to a cabin with no wifi" },
                    { label: "Need", color: "bg-green-100 text-green-600", text: "My running shoes are finally done. Size 8." },
                  ].map((h, i) => (
                    <div key={i} className="px-3 py-2 border border-stone-100 rounded-xl">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1 ${h.color}`}>{h.label}</span>
                      <p className="text-stone-700 text-xs leading-relaxed">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: the AI recommendations */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">What the AI recommends</p>
              <div className="flex flex-col gap-2">
                {[
                  { title: "Lodge 5-Quart Cast Iron Dutch Oven", why: "She mentioned wanting a Dutch oven for sourdough — this is the go-to.", price: "$45–$60", claimed: false },
                  { title: "Bread Scoring Lame Set", why: "The perfect companion for sourdough baking she's been into.", price: "$15–$25", claimed: true },
                  { title: "Hoka Clifton 9 Running Shoes", why: "She said her running shoes are done — these are the top-rated replacement.", price: "$140", claimed: false },
                ].map((r, i) => (
                  <div key={i} className={`bg-white rounded-xl p-3 border ${r.claimed ? "border-green-200 bg-green-50/30" : "border-stone-200"}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-stone-900 text-xs">{r.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {r.claimed && <span className="text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Taken</span>}
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">{r.price}</span>
                      </div>
                    </div>
                    <p className="text-stone-400 text-xs mb-2">{r.why}</p>
                    <div className="flex gap-1.5">
                      <div className="flex-1 py-1.5 bg-amber-400 text-stone-900 font-semibold rounded-lg text-xs text-center">Find on Amazon →</div>
                      {!r.claimed && <div className="px-2 py-1.5 border border-stone-200 text-stone-400 text-xs font-semibold rounded-lg">I&apos;m getting this</div>}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-stone-400">AI-powered · Personalized to her hints · Amazon links included</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-center text-2xl font-bold text-stone-900 mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-stone-50 rounded-2xl p-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-stone-900 mb-2">Drop hints</h3>
            <p className="text-stone-500 text-sm leading-relaxed">Tell GiftButler what you&apos;re into, dreaming about, or need. As casual as texting a friend.</p>
          </div>
          <div className="bg-stone-50 rounded-2xl p-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
              <Link2 className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-stone-900 mb-2">Share your link</h3>
            <p className="text-stone-500 text-sm leading-relaxed">When someone asks &ldquo;what do you want?&rdquo; — send them your GiftButler link. Done.</p>
          </div>
          <div className="bg-stone-50 rounded-2xl p-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
              <Gift className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-stone-900 mb-2">Get perfect gifts</h3>
            <p className="text-stone-500 text-sm leading-relaxed">The AI reads your hints and gives buyers specific, thoughtful ideas. No more generic gifts.</p>
          </div>
        </div>
      </section>

      {/* Benefits list */}
      <section className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-stone-900 mb-6 text-center">Everything you&apos;d want. Nothing you don&apos;t.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Free forever for everyone",
              "AI gift ideas from your hints",
              "Amazon links with one click",
              "Birthday countdown for buyers",
              "Email when someone visits",
              "Email when a gift is claimed",
              "Claim coordination (no duplicates)",
              "Share kit with ready-to-send messages",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-stone-900" />
                </div>
                <span className="text-stone-700 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            {!isSignedIn ? (
              <Link href="/sign-up" className="inline-block px-8 py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-base transition-colors">
                Create my free profile →
              </Link>
            ) : (
              <Link href="/dashboard" className="inline-block px-8 py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-base transition-colors">
                Go to my profile →
              </Link>
            )}
            <p className="text-stone-400 text-sm mt-3">Takes 2 minutes to set up.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 py-6 text-center text-stone-400 text-sm space-y-1">
        <p>GiftButler — Free for everyone, always.</p>
        <p className="text-xs text-stone-300">
          As an Amazon Associate, GiftButler earns from qualifying purchases. ·{" "}
          <Link href="/privacy" className="hover:text-stone-400 underline">Privacy Policy</Link>
          {" "}·{" "}
          <Link href="/terms" className="hover:text-stone-400 underline">Terms</Link>
        </p>
      </footer>
    </main>
  );
}
