"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface EbayListing {
  itemId: string;
  title: string;
  price: number;
  condition: string;
  imageUrl: string;
  itemUrl: string;
}

interface BestBuyProduct {
  sku: string;
  name: string;
  salePrice: number;
  regularPrice: number;
  url: string;
  image: string;
  onSale: boolean;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  price: number;
  url: string;
  imageUrl: string;
  shopName: string;
}

interface WalmartProduct {
  itemId: string;
  name: string;
  salePrice: number;
  msrp: number;
  imageUrl: string;
  productUrl: string;
}

interface SoldSummary {
  averageSoldPrice: number;
  lowestSoldPrice: number;
  recentSoldCount: number;
}

interface SearchResult {
  query: string;
  budget?: number;
  amazonUrl: string;
  walmartUrl: string;
  ebayListings: EbayListing[];
  soldSummary: SoldSummary | null;
  bestBuyProducts: BestBuyProduct[];
  etsyListings: EtsyListing[];
  walmartProducts: WalmartProduct[];
  sources: { ebay: boolean; bestbuy: boolean; etsy: boolean; walmart: boolean };
}

function DealBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[color] || colors.blue}`}>
      {label}
    </span>
  );
}

function ProductCard({
  image, title, price, originalPrice, condition, badge, href, source,
}: {
  image: string; title: string; price: number; originalPrice?: number;
  condition?: string; badge?: { label: string; color: string }; href: string; source: string;
}) {
  const [imgError, setImgError] = useState(false);
  const savings = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white border border-stone-200 hover:border-amber-400 rounded-2xl p-4 flex gap-4 items-start shadow-sm transition-colors group"
    >
      {image && !imgError ? (
        <img
          src={image}
          alt={title}
          className="w-16 h-16 object-contain rounded-xl bg-stone-50 flex-shrink-0"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-stone-100 flex-shrink-0 flex items-center justify-center text-2xl">🎁</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-400 mb-0.5">{source}</p>
        <p className="text-stone-900 font-medium text-sm leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
          {title}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-base font-bold text-stone-900">${price.toFixed(2)}</span>
          {originalPrice && originalPrice > price && (
            <span className="text-xs text-stone-400 line-through">${originalPrice.toFixed(2)}</span>
          )}
          {savings && savings > 0 && (
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">-{savings}%</span>
          )}
          {condition && condition !== "New" && (
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{condition}</span>
          )}
          {badge && <DealBadge label={badge.label} color={badge.color} />}
        </div>
      </div>
      <span className="text-stone-300 group-hover:text-amber-400 transition-colors text-lg mt-1 flex-shrink-0">→</span>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-stone-100 rounded-2xl" />)}
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
  const [error, setError] = useState(false);
  const [newQuery, setNewQuery] = useState(query);

  useEffect(() => {
    if (!query) { router.push("/"); return; }
    setLoading(true);
    setError(false);
    setResult(null);
    const params = new URLSearchParams({ q: query });
    if (budget) params.set("budget", budget);
    fetch(`/api/search?${params}`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data) => { setResult(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [query, budget, router]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuery.trim()) return;
    const params = new URLSearchParams({ q: newQuery.trim() });
    if (budget) params.set("budget", budget);
    router.push(`/results?${params.toString()}`);
  }

  const totalResults = result
    ? result.ebayListings.length + result.bestBuyProducts.length + result.etsyListings.length + result.walmartProducts.length
    : 0;

  // Determine deal verdict vs Amazon price
  const amazonDealVerdict = (amazonPrice: number, avg: number) => {
    if (!avg) return null;
    const diff = ((amazonPrice - avg) / avg) * 100;
    if (diff > 15) return { label: `Amazon is ${Math.round(diff)}% above market`, color: "red" };
    if (diff < -15) return { label: `Amazon is ${Math.round(Math.abs(diff))}% below market`, color: "green" };
    return { label: "Amazon is fairly priced", color: "blue" };
  };

  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push("/")} className="text-2xl hover:scale-110 transition-transform" aria-label="Home">🎁</button>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
          />
          <button type="submit" className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors shadow-sm">
            Search
          </button>
        </form>
      </div>

      {loading && <Skeleton />}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">😕</div>
          <p className="font-semibold text-stone-700 mb-2">Something went wrong</p>
          <p className="text-sm text-stone-400 mb-6">We had trouble fetching prices. Try searching again.</p>
          <button
            onClick={() => { setLoading(true); setError(false); }}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-2xl text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && result && (
        <>
          <p className="text-sm text-stone-400 mb-5">
            {totalResults > 0
              ? <><span className="text-stone-700 font-medium">{totalResults} results</span> for "{result.query}"</>
              : <>Searching for <span className="text-stone-700 font-medium">"{result.query}"</span></>
            }
            {result.budget ? ` · under $${result.budget}` : ""}
          </p>

          {/* Market Intelligence */}
          {result.soldSummary && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Market Intelligence</p>
              <p className="text-stone-700 text-sm leading-relaxed">
                Based on <strong>{result.soldSummary.recentSoldCount} recent sales</strong>, this typically sells for{" "}
                <strong>${result.soldSummary.averageSoldPrice}</strong>.
                Lowest sold: <strong>${result.soldSummary.lowestSoldPrice}</strong>.
              </p>
            </div>
          )}

          {/* Store cards — always shown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <a
              href={result.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-stone-200 hover:border-amber-400 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-sm font-bold text-white">a</div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">Amazon</p>
                  <p className="text-xs text-stone-400">New · Prime · Fast shipping</p>
                </div>
              </div>
              <span className="text-stone-300 group-hover:text-amber-400 font-medium text-sm transition-colors">Shop →</span>
            </a>
            <a
              href={result.walmartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-stone-200 hover:border-amber-400 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-sm font-bold text-white">W</div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">Walmart</p>
                  <p className="text-xs text-stone-400">Everyday low prices</p>
                </div>
              </div>
              <span className="text-stone-300 group-hover:text-amber-400 font-medium text-sm transition-colors">Shop →</span>
            </a>
          </div>

          {/* Best Buy */}
          {result.bestBuyProducts.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Best Buy</h2>
              <div className="flex flex-col gap-3">
                {result.bestBuyProducts.map((p) => (
                  <ProductCard
                    key={p.sku}
                    image={p.image}
                    title={p.name}
                    price={p.salePrice}
                    originalPrice={p.regularPrice > p.salePrice ? p.regularPrice : undefined}
                    badge={p.onSale ? { label: "On Sale", color: "orange" } : undefined}
                    href={p.url}
                    source="Best Buy"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Walmart products */}
          {result.walmartProducts.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Walmart</h2>
              <div className="flex flex-col gap-3">
                {result.walmartProducts.map((p) => (
                  <ProductCard
                    key={p.itemId}
                    image={p.imageUrl}
                    title={p.name}
                    price={p.salePrice}
                    originalPrice={p.msrp > p.salePrice ? p.msrp : undefined}
                    href={p.productUrl}
                    source="Walmart"
                  />
                ))}
              </div>
            </section>
          )}

          {/* eBay */}
          {result.ebayListings.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">eBay — New &amp; Used</h2>
              <div className="flex flex-col gap-3">
                {result.ebayListings.map((item) => {
                  const isGreat = result.soldSummary && item.price < result.soldSummary.averageSoldPrice * 0.8;
                  const isGood = result.soldSummary && !isGreat && item.price <= result.soldSummary.averageSoldPrice * 1.1;
                  return (
                    <ProductCard
                      key={item.itemId}
                      image={item.imageUrl}
                      title={item.title}
                      price={item.price}
                      condition={item.condition}
                      badge={isGreat ? { label: "🔥 Great Deal", color: "green" } : isGood ? { label: "👍 Good Price", color: "blue" } : undefined}
                      href={item.itemUrl}
                      source="eBay"
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Etsy */}
          {result.etsyListings.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Etsy — Handmade &amp; Unique</h2>
              <div className="flex flex-col gap-3">
                {result.etsyListings.map((item) => (
                  <ProductCard
                    key={item.listing_id}
                    image={item.imageUrl}
                    title={item.title}
                    price={item.price}
                    badge={{ label: "🎨 Handmade", color: "purple" }}
                    href={item.url}
                    source={item.shopName ? `Etsy · ${item.shopName}` : "Etsy"}
                  />
                ))}
              </div>
            </section>
          )}

          {/* No live results */}
          {totalResults === 0 && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-semibold text-stone-700 mb-1">No exact matches found</p>
              <p className="text-sm text-stone-400">
                Try a shorter or more general search term. Amazon and Walmart above may have what you're looking for.
              </p>
            </div>
          )}
        </>
      )}

      <footer className="mt-16 text-stone-400 text-xs text-center">
        GiftButler may earn a commission on purchases. &nbsp;·&nbsp;
        <button onClick={() => router.push("/")} className="underline hover:text-stone-600">New search</button>
      </footer>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <div className="h-12 bg-stone-100 rounded-xl mb-8 animate-pulse" />
        <div className="flex flex-col gap-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-stone-100 rounded-2xl" />)}
        </div>
      </main>
    }>
      <ResultsContent />
    </Suspense>
  );
}
