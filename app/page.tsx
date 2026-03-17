"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams({ q: query.trim() });
    if (budget) params.set("budget", budget);
    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl text-center">
        <div className="mb-2 text-5xl">🎁</div>
        <h1 className="text-4xl font-bold text-stone-900 mb-2">GiftButler</h1>
        <p className="text-stone-500 mb-10 text-lg">
          Find the best real price for any gift — across Amazon, eBay, and more.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='What are you looking for? e.g. "fishing rod for dad"'
            className="w-full px-5 py-4 rounded-2xl border border-stone-200 bg-white shadow-sm text-stone-900 placeholder-stone-400 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-3">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Budget (optional) $"
              className="flex-1 px-5 py-4 rounded-2xl border border-stone-200 bg-white shadow-sm text-stone-900 placeholder-stone-400 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-2xl shadow-sm transition-colors text-base"
            >
              Find Deals
            </button>
          </div>
        </form>

        <p className="mt-8 text-sm text-stone-400">
          We show real sold prices — not just what sellers are asking.
        </p>
      </div>

      <footer className="absolute bottom-6 text-stone-400 text-xs">
        GiftButler may earn a commission on purchases. Prices are updated in real time.
      </footer>
    </main>
  );
}
