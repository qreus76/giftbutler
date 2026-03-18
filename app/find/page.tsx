"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { RECIPIENTS, INTERESTS, OCCASIONS } from "@/lib/giftQueries";

interface GiftProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  url: string;
  source: string;
  searchQuery: string;
  onSale?: boolean;
  condition?: string;
}

interface GiftResult {
  recipient: string;
  interests: string[];
  budget: number;
  products: GiftProduct[];
  totalFound: number;
  amazonUrl: string;
  walmartUrl: string;
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-36 bg-amber-50 border-2 border-amber-100 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-64 bg-stone-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    "Best Buy": "bg-blue-100 text-blue-700",
    "Etsy": "bg-orange-100 text-orange-700",
    "eBay": "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[source] || "bg-stone-100 text-stone-600"}`}>
      {source}
    </span>
  );
}

function BestPickCard({ product, onCheckPrice }: { product: GiftProduct; onCheckPrice: (name: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const savings = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="bg-white border-2 border-amber-400 rounded-2xl overflow-hidden shadow-sm mb-5">
      <div className="bg-amber-50 px-4 py-2 flex items-center gap-2 border-b border-amber-200">
        <span className="text-amber-700 font-bold text-xs uppercase tracking-wide">⭐ Best Pick</span>
        <SourceBadge source={product.source} />
        {product.onSale && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">On Sale</span>
        )}
      </div>
      <div className="p-4 flex gap-4">
        <div className="w-24 h-24 bg-stone-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className="max-h-20 max-w-full object-contain"
              onError={() => setImgError(true)}
              loading="eager"
            />
          ) : (
            <span className="text-4xl">🎁</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-stone-900 font-semibold text-sm leading-snug mb-2 line-clamp-2">{product.name}</p>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xl font-bold text-stone-900">${product.price.toFixed(2)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-stone-400 line-through">${product.originalPrice.toFixed(2)}</span>
            )}
            {savings && savings > 0 && (
              <span className="text-sm font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">-{savings}% off</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-xl text-sm transition-colors"
            >
              Shop Now →
            </a>
            <button
              onClick={() => onCheckPrice(product.name)}
              className="px-4 py-2 border border-stone-200 text-stone-600 text-sm font-semibold rounded-xl hover:bg-stone-50 transition-colors"
            >
              Compare prices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GiftCard({ product, onCheckPrice }: { product: GiftProduct; onCheckPrice: (name: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const savings = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-amber-300 transition-colors">
      <a href={product.url} target="_blank" rel="noopener noreferrer" className="group">
        <div className="bg-stone-50 p-4 flex items-center justify-center h-40">
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className="max-h-32 max-w-full object-contain group-hover:scale-105 transition-transform"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="text-4xl">🎁</div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <SourceBadge source={product.source} />
            {product.onSale && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sale</span>
            )}
            {product.condition && product.condition !== "New" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{product.condition}</span>
            )}
          </div>
          <p className="text-stone-900 font-medium text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-base font-bold text-stone-900">${product.price.toFixed(2)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-stone-400 line-through">${product.originalPrice.toFixed(2)}</span>
            )}
            {savings && savings > 0 && (
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">-{savings}%</span>
            )}
          </div>
        </div>
      </a>
      <div className="px-3 pb-3 mt-auto">
        <button
          onClick={() => onCheckPrice(product.name)}
          className="w-full py-2 rounded-xl border border-amber-400 text-amber-700 text-xs font-semibold hover:bg-amber-50 transition-colors"
        >
          Is this the best price? →
        </button>
      </div>
    </div>
  );
}

function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center my-5">
        <p className="text-amber-700 font-semibold text-sm">✓ You&apos;re in! We&apos;ll send the best deals to your inbox.</p>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 my-5">
      <p className="text-stone-900 font-semibold text-sm mb-0.5">💌 Get weekly gift deals</p>
      <p className="text-stone-400 text-xs mb-3">Price drops and top picks — delivered free.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 text-stone-900 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
        >
          {loading ? "..." : "Subscribe →"}
        </button>
      </form>
    </div>
  );
}

function FindContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const recipient = searchParams.get("for") || "";
  const interestsParam = searchParams.get("interests") || "";
  const budgetParam = searchParams.get("budget") || "";
  const occasion = searchParams.get("occasion") || "";

  const [result, setResult] = useState<GiftResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const recipientLabel = RECIPIENTS.find((r) => r.id === recipient);
  const interestLabels = interestsParam.split(",").map((id) => INTERESTS.find((i) => i.id === id)).filter(Boolean);
  const occasionLabel = occasion ? OCCASIONS.find((o) => o.id === occasion) : null;

  useEffect(() => {
    if (!recipient) { router.push("/"); return; }
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ for: recipient });
    if (interestsParam) params.set("interests", interestsParam);
    if (budgetParam) params.set("budget", budgetParam);
    if (occasion) params.set("occasion", occasion);
    fetch(`/api/gifts?${params}`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data) => { setResult(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [recipient, interestsParam, budgetParam, occasion, router]);

  async function handleShare() {
    const url = window.location.href;
    const title = `${occasionLabel ? occasionLabel.emoji + " " : ""}Gifts for ${recipientLabel?.label}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: "Found some great gift ideas on GiftButler!", url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCheckPrice(productName: string) {
    router.push(`/results?q=${encodeURIComponent(productName)}`);
  }

  // Best Pick: product with highest discount %, fallback to first product
  const bestPick = result?.products.length
    ? [...result.products].sort((a, b) => {
        const savA = a.originalPrice && a.originalPrice > a.price ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const savB = b.originalPrice && b.originalPrice > b.price ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return savB - savA;
      })[0]
    : null;

  const otherProducts = result?.products.filter((p) => p.id !== bestPick?.id) ?? [];

  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-2xl hover:scale-110 transition-transform flex-shrink-0" aria-label="Home">
          🎁
        </button>
        <div className="flex-1 min-w-0">
          {recipientLabel && (
            <h1 className="text-base font-bold text-stone-900 truncate">
              {occasionLabel ? `${occasionLabel.emoji} ` : ""}{recipientLabel.emoji} Gifts for {recipientLabel.label}
              {budgetParam ? ` · Under $${budgetParam}` : ""}
            </h1>
          )}
          {interestLabels.length > 0 && (
            <p className="text-xs text-stone-400">{interestLabels.map((i) => i?.label).join(" · ")}</p>
          )}
        </div>
        <button
          onClick={handleShare}
          className="text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors whitespace-nowrap flex-shrink-0"
        >
          {copied ? "✓ Copied!" : "Share"}
        </button>
        <button onClick={() => router.push("/")} className="text-xs text-stone-400 hover:text-stone-600 underline whitespace-nowrap flex-shrink-0">
          Start over
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div>
          <div className="h-4 w-48 bg-stone-100 rounded-full mb-6 animate-pulse" />
          <Skeleton />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">😕</div>
          <p className="font-semibold text-stone-700 mb-2">Something went wrong</p>
          <p className="text-sm text-stone-400 mb-6">We couldn&apos;t load gift ideas right now. Try again.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setLoading(true); setError(false); window.location.reload(); }}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-2xl text-sm transition-colors"
            >
              Try Again
            </button>
            <button onClick={() => router.push("/")} className="px-6 py-3 border border-stone-200 text-stone-600 font-semibold rounded-2xl text-sm hover:bg-stone-50 transition-colors">
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && result && (
        <>
          {result.products.length > 0 ? (
            <>
              <p className="text-sm text-stone-400 mb-5">
                <span className="text-stone-700 font-medium">{result.products.length} gift ideas</span> found across {[...new Set(result.products.map(p => p.source))].join(", ")}.
              </p>

              {/* Best Pick */}
              {bestPick && <BestPickCard product={bestPick} onCheckPrice={handleCheckPrice} />}

              {/* Remaining products */}
              {otherProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {otherProducts.map((product) => (
                    <GiftCard key={product.id} product={product} onCheckPrice={handleCheckPrice} />
                  ))}
                </div>
              )}

              {/* Email capture */}
              <EmailCapture />

              {/* Browse more on Amazon / Walmart */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={result.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between hover:border-amber-400 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-900">More on Amazon</p>
                    <p className="text-xs text-stone-400">Millions of options</p>
                  </div>
                  <span className="text-amber-600 font-semibold text-sm">Browse →</span>
                </a>
                <a
                  href={result.walmartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between hover:border-blue-400 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-stone-900">More on Walmart</p>
                    <p className="text-xs text-stone-400">Everyday low prices</p>
                  </div>
                  <span className="text-blue-600 font-semibold text-sm">Browse →</span>
                </a>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🤔</div>
              <p className="font-semibold text-stone-700 mb-2">No results for this combination</p>
              <p className="text-sm text-stone-400 mb-6">Try different interests or a higher budget.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => router.push("/")} className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-2xl text-sm transition-colors">
                  Try Again
                </button>
                <a href={result.amazonUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 border border-stone-200 text-stone-600 font-semibold rounded-2xl text-sm hover:bg-stone-50 transition-colors">
                  Search Amazon →
                </a>
              </div>
            </div>
          )}
        </>
      )}

      <footer className="mt-12 text-stone-400 text-xs text-center">
        GiftButler may earn a commission on purchases. &nbsp;·&nbsp;
        <button onClick={() => router.push("/")} className="underline hover:text-stone-600">New search</button>
      </footer>
    </main>
  );
}

export default function FindPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-2xl">🎁</div>
          <div className="h-5 w-48 bg-stone-100 rounded-full animate-pulse" />
        </div>
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-36 bg-amber-50 rounded-2xl border-2 border-amber-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-stone-100 rounded-2xl" />)}
          </div>
        </div>
      </main>
    }>
      <FindContent />
    </Suspense>
  );
}
