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
    great: "bg-green-100 text-green-800",
    good: "bg-blue-100 text-blue-800",
    fair: "bg-yellow-100 text-yellow-800",
    overpriced: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    great: "Great Deal",
    good: "Good Price",
    fair: "Fair Price",
    overpriced: "Overpriced",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[score] || styles.fair}`}>
      {labels[score] || "Fair Price"}
    </span>
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
    const params = new URLSearchParams({ q: query });
    if (budget) params.set("budget", budget);
    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
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
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push("/")} className="text-2xl">🎁</button>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-20 text-stone-400">
          <div className="text-4xl mb-4">🔍</div>
          <p>Searching for the best prices...</p>
        </div>
      )}

      {!loading && result && (
        <>
          {/* Market Intelligence Banner — powered by eBay sold data */}
          {result.soldSummary && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
              <p className="text-sm font-semibold text-amber-800 mb-1">Market Intelligence</p>
              <p className="text-stone-700 text-sm">
                Based on <strong>{result.soldSummary.recentSoldCount} recent sales</strong>,
                this item typically sells for{" "}
                <strong>${result.soldSummary.averageSoldPrice}</strong>.
                Lowest active listing: <strong>${result.soldSummary.lowestActiveListing}</strong>.
              </p>
            </div>
          )}

          {/* eBay not ready yet */}
          {!result.ebayReady && (
            <div className="bg-stone-100 border border-stone-200 rounded-2xl p-4 mb-6 text-sm text-stone-500">
              Live price comparison coming soon — eBay integration activating shortly.
              For now, search Amazon directly below.
            </div>
          )}

          {/* Amazon CTA */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="font-semibold text-stone-900">Amazon</p>
              <p className="text-sm text-stone-500">New & sold by Amazon + third-party sellers</p>
            </div>
            <a
              href={result.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors"
            >
              Shop Amazon →
            </a>
          </div>

          {/* eBay Listings */}
          {result.ebayListings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                eBay Listings — New &amp; Used
              </h2>
              <div className="flex flex-col gap-3">
                {result.ebayListings.map((item) => (
                  <a
                    key={item.itemId}
                    href={item.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-4 items-start hover:border-amber-400 transition-colors shadow-sm"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 object-contain rounded-lg bg-stone-50 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-900 font-medium text-sm leading-snug line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg font-bold text-stone-900">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="text-xs text-stone-400">{item.condition}</span>
                        {result.soldSummary && item.price < result.soldSummary.averageSoldPrice * 0.8 && (
                          <DealBadge score="great" />
                        )}
                        {result.soldSummary && item.price >= result.soldSummary.averageSoldPrice * 0.8 && item.price <= result.soldSummary.averageSoldPrice * 1.1 && (
                          <DealBadge score="good" />
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Fallback when eBay has no results yet */}
          {result.ebayListings.length === 0 && result.ebayReady && (
            <p className="text-stone-400 text-sm text-center py-8">
              No eBay listings found for this search. Try a different term.
            </p>
          )}
        </>
      )}

      <footer className="mt-12 text-stone-400 text-xs text-center">
        GiftButler may earn a commission on purchases. &nbsp;·&nbsp;{" "}
        <a href="/" className="underline">New search</a>
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
