"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RECIPIENTS, INTERESTS, BUDGETS, type Recipient, type Interest } from "@/lib/giftQueries";

type Mode = "gift" | "search";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("gift");
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  function toggleInterest(id: Interest) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id].slice(0, 3)
    );
  }

  function handleGiftSearch() {
    if (!recipient) return;
    const params = new URLSearchParams({ for: recipient });
    if (interests.length) params.set("interests", interests.join(","));
    if (budget) params.set("budget", String(budget));
    router.push(`/find?${params.toString()}`);
  }

  function handleDirectSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/results?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-16 pb-16">

      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🎁</div>
        <h1 className="text-4xl font-bold text-stone-900 tracking-tight">GiftButler</h1>
        <p className="text-stone-500 mt-2 text-base">Find the perfect gift at the best price.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-stone-100 rounded-2xl p-1 mb-10 gap-1">
        <button
          onClick={() => { setMode("gift"); setStep(1); }}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "gift" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
        >
          Find a Gift Idea
        </button>
        <button
          onClick={() => setMode("search")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "search" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
        >
          Check a Price
        </button>
      </div>

      {/* GIFT DISCOVERY MODE */}
      {mode === "gift" && (
        <div className="w-full max-w-xl">

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-amber-400 text-stone-900" : "bg-stone-200 text-stone-400"}`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-amber-400" : "bg-stone-200"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 — Who */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 text-center mb-2">Who are you shopping for?</h2>
              <p className="text-stone-400 text-sm text-center mb-6">Pick one to get started.</p>
              <div className="grid grid-cols-4 gap-3">
                {RECIPIENTS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setRecipient(r.id); setStep(2); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${recipient === r.id ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white hover:border-amber-300"}`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-xs font-semibold text-stone-700">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Interests */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 text-center mb-2">What are they into?</h2>
              <p className="text-stone-400 text-sm text-center mb-6">
                Pick up to 3 interests.{" "}
                {interests.length > 0 && <span className="text-amber-600 font-semibold">{interests.length}/3 selected</span>}
              </p>
              <div className="grid grid-cols-5 gap-2 mb-8">
                {INTERESTS.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => toggleInterest(i.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${interests.includes(i.id) ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white hover:border-amber-300"}`}
                  >
                    <span className="text-xl">{i.emoji}</span>
                    <span className="text-xs font-semibold text-stone-700">{i.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-500 text-sm font-semibold hover:bg-stone-50 transition-colors">
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={interests.length === 0}
                  className="flex-1 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 text-sm font-semibold transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Budget */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 text-center mb-2">What&apos;s your budget?</h2>
              <p className="text-stone-400 text-sm text-center mb-6">We&apos;ll find the best deals in your range.</p>
              <div className="flex flex-col gap-3 mb-8">
                {BUDGETS.map((b) => (
                  <button
                    key={b.max}
                    onClick={() => setBudget(b.max)}
                    className={`w-full py-4 rounded-2xl border-2 text-sm font-semibold transition-all ${budget === b.max ? "border-amber-400 bg-amber-50 text-stone-900" : "border-stone-200 bg-white text-stone-700 hover:border-amber-300"}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-500 text-sm font-semibold hover:bg-stone-50 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleGiftSearch}
                  disabled={!budget}
                  className="flex-1 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 text-sm font-bold transition-colors"
                >
                  Find Gifts →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRICE CHECK MODE */}
      {mode === "search" && (
        <div className="w-full max-w-xl">
          <h2 className="text-xl font-bold text-stone-900 text-center mb-2">What are you looking for?</h2>
          <p className="text-stone-400 text-sm text-center mb-6">Enter a specific product to check if you&apos;re getting the best price.</p>
          <form onSubmit={handleDirectSearch} className="flex flex-col gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='e.g. "Sony WH-1000XM5 headphones"'
              className="w-full px-5 py-4 rounded-2xl border border-stone-200 bg-white shadow-sm text-stone-900 placeholder-stone-400 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl transition-colors text-base"
            >
              Check Price →
            </button>
          </form>
        </div>
      )}

      <footer className="mt-16 text-stone-400 text-xs text-center">
        GiftButler may earn a commission on purchases made through our links.
      </footer>
    </main>
  );
}
