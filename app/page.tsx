"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingDown, Tag } from "lucide-react";

const CATEGORIES = [
  { label: "For Dad", emoji: "👨", q: "gift for dad" },
  { label: "For Mom", emoji: "👩", q: "gift for mom" },
  { label: "For Him", emoji: "🎯", q: "gift for him" },
  { label: "For Her", emoji: "💐", q: "gift for her" },
  { label: "Under $25", emoji: "💵", q: "gift ideas", budget: "25" },
  { label: "Under $50", emoji: "💳", q: "gift ideas", budget: "50" },
  { label: "Tech Gifts", emoji: "📱", q: "tech gadget gift" },
  { label: "Kids", emoji: "🧸", q: "gift for kids" },
];

const HOW_IT_WORKS = [
  { Icon: Search, title: "Search anything", desc: "Type what you're looking for or pick a category." },
  { Icon: TrendingDown, title: "See real prices", desc: "We pull live listings and what items actually sold for — not just asking prices." },
  { Icon: Tag, title: "Spot the deal", desc: "We flag items priced below market value so you never overpay." },
];

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

  function handleCategory(q: string, b?: string) {
    const params = new URLSearchParams({ q });
    if (b) params.set("budget", b);
    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-20 pb-16">
      {/* Hero */}
      <div className="w-full max-w-xl text-center">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          ✨ Real sold prices, not just asking prices
        </div>
        <h1 className="text-5xl font-bold text-stone-900 mb-3 tracking-tight">GiftButler</h1>
        <p className="text-stone-500 mb-10 text-lg leading-relaxed">
          Find the best price for any gift across Amazon, eBay, and more.<br />
          Know when you're actually getting a deal.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "wireless headphones for dad"'
            className="w-full px-5 py-4 rounded-2xl border border-stone-200 bg-white shadow-sm text-stone-900 placeholder-stone-400 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
            autoFocus
          />
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Max budget (optional)"
                className="w-full pl-8 pr-4 py-4 rounded-2xl border border-stone-200 bg-white shadow-sm text-stone-900 placeholder-stone-400 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-stone-900 font-semibold rounded-2xl shadow-sm transition-colors text-base whitespace-nowrap"
            >
              Find Deals
            </button>
          </div>
        </form>

        {/* Category shortcuts */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => handleCategory(cat.q, cat.budget)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-full text-sm text-stone-700 font-medium transition-colors shadow-sm"
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="w-full max-w-2xl mt-20">
        <h2 className="text-center text-sm font-semibold text-stone-400 uppercase tracking-widest mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.title} className="text-center px-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <step.Icon size={22} className="text-amber-600" />
              </div>
              <p className="font-semibold text-stone-900 mb-1">{step.title}</p>
              <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-16 text-stone-400 text-xs text-center">
        GiftButler may earn a commission on purchases made through our links.
      </footer>
    </main>
  );
}
