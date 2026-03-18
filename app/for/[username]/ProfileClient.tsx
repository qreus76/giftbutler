"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile, Hint } from "@/lib/supabase";

interface GiftRecommendation {
  title: string;
  why: string;
  priceRange: string;
  searchUrl: string;
}

interface ClaimRecord {
  description: string;
  occasion: string | null;
}

const CATEGORIES = {
  general: { label: "Into lately", color: "bg-amber-100 text-amber-700" },
  want: { label: "Want", color: "bg-blue-100 text-blue-600" },
  need: { label: "Need", color: "bg-green-100 text-green-600" },
  dream: { label: "Dream", color: "bg-purple-100 text-purple-600" },
  avoid: { label: "Please no", color: "bg-red-100 text-red-600" },
};

function getDaysUntilBirthday(birthday: string): number | null {
  // Parse YYYY-MM-DD safely without timezone issues
  const parts = birthday.split("-");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), month, day);
  if (next.getTime() <= today.getTime()) {
    next = new Date(today.getFullYear() + 1, month, day);
  }
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface Props {
  username: string;
  initialProfile: Profile;
  initialHints: Hint[];
  initialClaims: ClaimRecord[];
  avatarUrl: string | null;
}

export default function ProfileClient({ username, initialProfile, initialHints, initialClaims, avatarUrl }: Props) {
  const router = useRouter();

  const [profile] = useState<Profile>(initialProfile);
  const [hints] = useState<Hint[]>(initialHints);

  const [showFinder, setShowFinder] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [budget, setBudget] = useState("");
  const [occasion, setOccasion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [recommendations, setRecommendations] = useState<GiftRecommendation[]>([]);
  const [myClaims, setMyClaims] = useState<string[]>([]);
  const [existingClaims, setExistingClaims] = useState<ClaimRecord[]>(initialClaims);

  // Record visit client-side (SSR page doesn't block on this)
  useEffect(() => {
    fetch(`/api/profile/${username}`);
  }, [username]);

  async function generateGifts() {
    if (!relationship || !budget) return;
    setGenerating(true);
    setGenerateError("");
    setRecommendations([]);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, relationship, budget, occasion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      if (!data.recommendations?.length) throw new Error("No recommendations returned");
      setRecommendations(data.recommendations);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally {
      setGenerating(false);
    }
  }

  function claimGift(title: string) {
    setMyClaims([...myClaims, title]);
    setExistingClaims([...existingClaims, { description: title.toLowerCase(), occasion: occasion || null }]);
    fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_username: username, gift_description: title, occasion }),
    });
  }

  // A gift is "already claimed" if same title AND (no occasion specified OR occasions match)
  function isAlreadyClaimed(title: string): boolean {
    return existingClaims.some(c =>
      c.description === title.toLowerCase() &&
      (!c.occasion || !occasion || c.occasion === occasion)
    );
  }

  const hintsToShow = hints.filter(h => h.category !== "avoid");
  const avoidHints = hints.filter(h => h.category === "avoid");
  const daysUntilBirthday = profile.birthday ? getDaysUntilBirthday(profile.birthday) : null;
  const displayName = profile.name || username;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Birthday countdown banner */}
        {daysUntilBirthday !== null && daysUntilBirthday <= 60 && (
          <div className="bg-amber-400 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
            <span className="text-2xl">🎂</span>
            <div>
              {daysUntilBirthday === 0 ? (
                <p className="font-bold text-stone-900">Today is {displayName}&apos;s birthday!</p>
              ) : daysUntilBirthday === 1 ? (
                <p className="font-bold text-stone-900">{displayName}&apos;s birthday is <span className="underline">tomorrow</span></p>
              ) : (
                <p className="font-bold text-stone-900">{displayName}&apos;s birthday is in <span className="underline">{daysUntilBirthday} days</span></p>
              )}
              <p className="text-stone-700 text-xs">Don&apos;t leave it too late — find the perfect gift below</p>
            </div>
          </div>
        )}

        {/* Profile header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-amber-400 flex items-center justify-center text-2xl font-bold text-stone-900">
                {profile.name?.[0]?.toUpperCase() || username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-stone-900">{displayName}</h1>
          <p className="text-stone-400 text-sm">@{username}</p>
          {profile.bio && <p className="text-stone-600 text-sm mt-2">{profile.bio}</p>}
        </div>

        {/* Find a gift button */}
        {!showFinder && (
          <div className="mb-6">
            <button
              onClick={() => setShowFinder(true)}
              className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-base transition-colors shadow-sm"
            >
              Find the perfect gift for {displayName} →
            </button>
            {hintsToShow.length === 0 && (
              <p className="text-center text-xs text-stone-400 mt-2">
                {displayName} hasn&apos;t added hints yet — we&apos;ll suggest based on your relationship and budget.
              </p>
            )}
          </div>
        )}

        {/* Gift finder */}
        {showFinder && recommendations.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
            <h2 className="font-bold text-stone-900 mb-4">Find the perfect gift</h2>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-stone-500 mb-1 block">I am their</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select relationship...</option>
                  <option value="partner">Partner</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="best friend">Best friend</option>
                  <option value="friend">Friend</option>
                  <option value="colleague">Colleague</option>
                  <option value="other family member">Other family member</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 mb-1 block">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select budget...</option>
                  <option value="under $25">Under $25</option>
                  <option value="$25-$50">$25 – $50</option>
                  <option value="$50-$100">$50 – $100</option>
                  <option value="$100-$200">$100 – $200</option>
                  <option value="over $200">$200+</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 mb-1 block">Occasion (optional)</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select occasion...</option>
                  <option value="birthday">Birthday</option>
                  <option value="holiday">Holiday</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="Mother's Day">Mother&apos;s Day</option>
                  <option value="Father's Day">Father&apos;s Day</option>
                  <option value="graduation">Graduation</option>
                  <option value="just because">Just Because</option>
                </select>
              </div>
            </div>
            {generateError && (
              <p className="text-red-500 text-sm mb-3 text-center">{generateError}</p>
            )}
            <button
              onClick={generateGifts}
              disabled={!relationship || !budget || generating}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-bold rounded-xl transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin inline-block" />
                  Finding the perfect gift...
                </span>
              ) : generateError ? "Try again →" : "Generate gift ideas →"}
            </button>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-stone-900 mb-3">Gift ideas for {displayName}</h2>
            <div className="flex flex-col gap-3">
              {recommendations.map((rec, i) => {
                const alreadyClaimed = isAlreadyClaimed(rec.title);
                const iMineThis = myClaims.includes(rec.title);
                return (
                  <div key={i} className={`bg-white border rounded-2xl p-4 ${alreadyClaimed && !iMineThis ? "border-green-200 bg-green-50/30" : "border-stone-200"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-stone-900 text-sm">{rec.title}</h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {alreadyClaimed && !iMineThis && (
                          <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Someone&apos;s on it</span>
                        )}
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{rec.priceRange}</span>
                      </div>
                    </div>
                    <p className="text-stone-500 text-xs leading-relaxed mb-3">{rec.why}</p>
                    <div className="flex gap-2">
                      <a
                        href={rec.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-xs text-center transition-colors"
                      >
                        Find this gift →
                      </a>
                      <button
                        onClick={() => claimGift(rec.title)}
                        disabled={iMineThis || alreadyClaimed}
                        className="px-3 py-2 border border-stone-200 text-stone-500 text-xs font-semibold rounded-xl hover:bg-stone-50 disabled:bg-green-50 disabled:text-green-600 disabled:border-green-200 transition-colors whitespace-nowrap"
                      >
                        {iMineThis ? "✓ You're getting this" : alreadyClaimed ? "✓ Taken" : "I'm getting this"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => { setRecommendations([]); setGenerateError(""); setShowFinder(true); }}
              className="w-full mt-3 py-2.5 border border-stone-200 text-stone-500 text-sm font-semibold rounded-xl hover:bg-stone-50 transition-colors"
            >
              Generate different ideas
            </button>
          </div>
        )}

        {/* Hints feed */}
        {hintsToShow.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
              {displayName}&apos;s hints
            </h2>
            <div className="flex flex-col gap-2">
              {hintsToShow.map((hint) => {
                const cat = CATEGORIES[hint.category as keyof typeof CATEGORIES] || CATEGORIES.general;
                return (
                  <div key={hint.id} className="bg-white border border-stone-200 rounded-2xl px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1 ${cat.color}`}>
                      {cat.label}
                    </span>
                    <p className="text-stone-800 text-sm">{hint.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Avoid section */}
        {avoidHints.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Please avoid</p>
            <ul className="flex flex-col gap-1">
              {avoidHints.map((hint) => (
                <li key={hint.id} className="text-red-700 text-sm">— {hint.content}</li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA for visitors */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-stone-700 font-semibold text-sm mb-1">Want your own GiftButler profile?</p>
          <p className="text-stone-400 text-xs mb-3">Free forever. Share your link. Get gifts you actually want.</p>
          <a href="/" className="inline-block px-5 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">
            Create my profile →
          </a>
        </div>

        <div className="mt-6 text-center space-y-2">
          <button onClick={() => router.push("/")} className="text-xs text-stone-400 hover:text-stone-600">
            ← giftbutler.io
          </button>
          <p className="text-xs text-stone-300">
            As an Amazon Associate, GiftButler earns from qualifying purchases.{" "}
            <a href="/privacy" className="hover:text-stone-400 underline">Privacy</a>
            {" "}·{" "}
            <a href="/terms" className="hover:text-stone-400 underline">Terms</a>
          </p>
        </div>
      </div>
    </main>
  );
}
