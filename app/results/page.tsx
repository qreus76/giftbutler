"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { amazonSearchUrl } from "@/lib/amazon";

interface EbayListing {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  imageUrl: string;
  itemUrl: string;
  seller: string;
}

interface SoldSummary {
  averageSoldPrice: number;
  lowestActiveListing: number;
  recentSoldCount: number;
  dealScore: string;
}

interface SearchResult {
  query: string;
  budget?: number;
  amazonUrl: string;
  ebayListings: EbayListing[];
  soldSummary: SoldSummary | null;
  ebayReady: boolean;
}

function DealBadge({ score }: { score: string }) {
  const styles: Record<string, string> = {
    great: "bg-green-100 text-green-700",
    good: "bg-blue-100 text-blue-700",
    fair: "bg-yellow-100 text-yellow-700",
    overpriced: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    great: "🔥 Great Deal",
    good: "👍 Good Price",
    fair: "Fair Price",
    overpriced: "⚠️ Overpriced",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[score] || styles.fair}`}>
      {labels[score] || "Fair Price"}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-24 bg-stone-100 rounded-2xl" />
      <div className="h-24 bg-stone-100 rounded-2xl" />
      <div className="h-24 bg-stone-100 rounded-2xl" />
      <div className="h-24 bg-stone-100 rounded-2xl" />
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const budget = searchParams.get("budget") || "";

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [newQuery, setNewQuery] = useState(query);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setResult(null);
    const params = new URLSearchParams({ q: query });
    if (budget) params.set("budget", budget);
    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((data) => { setResult(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [query, budget]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuery.trim()) return;
    const params = new URLSearchParams({ q: newQuery.trim() });
    if (budget) params.set("budget", budget);
    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-2xl hover:scale-110 transition-transform"
          aria-label="Home"
        >
          🎁
        </button>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div>
          <div className="h-4 w-40 bg-stone-100 rounded-full mb-6 animate-pulse" />
          <Skeleton />
        </div>
      )}

      {!loading && result && (
        <>
          {/* Result label */}
          <p className="text-sm text-stone-400 mb-5">
            Results for <span className="text-stone-700 font-medium">"{result.query}"</span>
            {result.budget ? ` · Budget $${result.budget}` : ""}
          </p>

          {/* Market Intelligence Banner */}
          {result.soldSummary && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                Market Intelligence
              </p>
              <p className="text-stone-700 text-sm leading-relaxed">
                Based on <strong>{result.soldSummary.recentSoldCount} recent sales</strong>, this
                typically sells for <strong>${result.soldSummary.averageSoldPrice}</strong>.
                Lowest active: <strong>${result.soldSummary.lowestActiveListing}</strong>.
              </p>
            </div>
          )}

          {/* Amazon Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-lg font-bold text-stone-900">
                  a
                </div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">Amazon</p>
                  <p className="text-xs text-stone-400">New · Prime eligible · Fast shipping</p>
                </div>
              </div>
              <a
                href={result.amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors"
              >
                Shop →
              </a>
            </div>
          </div>

          {/* eBay Listings */}
          {result.ebayListings.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 px-1">
                eBay — New &amp; Used
              </h2>
              <div className="flex flex-col gap-3">
                {result.ebayListings.map((item) => {
                  const isGreat = result.soldSummary && item.price < result.soldSummary.averageSoldPrice * 0.8;
                  const isGood = result.soldSummary && !isGreat && item.price <= result.soldSummary.averageSoldPrice * 1.1;
                  return (
                    <a
                      key={item.itemId}
                      href={item.itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-stone-200 hover:border-amber-400 rounded-2xl p-4 flex gap-4 items-start transition-colors shadow-sm group"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-16 h-16 object-contain rounded-xl bg-stone-50 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-stone-100 flex-shrink-0 flex items-center justify-center text-2xl">
                          🎁
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-900 font-medium text-sm leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-base font-bold text-stone-900">
                            ${item.price.toFixed(2)}
                          </span>
                          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                            {item.condition}
                          </span>
                          {isGreat && <DealBadge score="great" />}
                          {isGood && <DealBadge score="good" />}
                        </div>
                      </div>
                      <span className="text-stone-300 group-hover:text-amber-400 transition-colors text-lg mt-1">→</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pre-eBay state — looks intentional, not broken */}
          {!result.ebayReady && (
            <div className="mt-5 bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">📦</div>
              <p className="font-semibold text-stone-700 mb-1">More sources coming</p>
              <p className="text-sm text-stone-400">
                We&apos;re connecting live eBay pricing — including used &amp; refurbished listings
                and real sold-price data. Check back soon.
              </p>
            </div>
          )}

          {/* eBay ready but no results */}
          {result.ebayReady && result.ebayListings.length === 0 && (
            <div className="mt-5 text-center py-10">
              <div className="text-3xl mb-3">🤷</div>
              <p className="text-stone-500 text-sm">No eBay listings found. Try a broader search term.</p>
            </div>
          )}
        </>
      )}

      <footer className="mt-16 text-stone-400 text-xs text-center">
        GiftButler may earn a commission on purchases. &nbsp;·&nbsp;
        <button onClick={() => router.push("/")} className="underline hover:text-stone-600">
          New search
        </button>
      </footer>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
