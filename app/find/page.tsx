"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { RECIPIENTS, INTERESTS } from "@/lib/giftQueries";

interface GiftProduct {
  sku: string;
  name: string;
  salePrice: number;
  regularPrice: number;
  url: string;
  image: string;
  onSale: boolean;
  searchQuery: string;
}

interface GiftResult {
  recipient: string;
  interests: string[];
  budget: number;
  products: GiftProduct[];
  amazonUrl: string;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-64 bg-stone-100 rounded-2xl" />
      ))}
    </div>
  );
}

function GiftCard({ product, onCheckPrice }: { product: GiftProduct; onCheckPrice: (name: string) => void }) {
  const savings = product.regularPrice > product.salePrice
    ? Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100)
    : null;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <a href={product.url} target="_blank" rel="noopener noreferrer" className="group">
        <div className="bg-stone-50 p-4 flex items-center justify-center h-40">
          {product.image ? (
            <img src={product.image} alt={product.name} className="max-h-32 max-w-full object-contain group-hover:scale-105 transition-transform" />
          ) : (
            <div className="text-4xl">🎁</div>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs text-stone-400 mb-1">Best Buy</p>
          <p className="text-stone-900 font-medium text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-base font-bold text-stone-900">${product.salePrice.toFixed(2)}</span>
            {savings && savings > 0 && (
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">-{savings}%</span>
            )}
            {product.onSale && (
              <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Sale</span>
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

function FindContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const recipient = searchParams.get("for") || "";
  const interestsParam = searchParams.get("interests") || "";
  const budgetParam = searchParams.get("budget") || "";

  const [result, setResult] = useState<GiftResult | null>(null);
  const [loading, setLoading] = useState(true);

  const recipientLabel = RECIPIENTS.find((r) => r.id === recipient);
  const interestLabels = interestsParam.split(",").map((id) => INTERESTS.find((i) => i.id === id)).filter(Boolean);

  useEffect(() => {
    if (!recipient) return;
    setLoading(true);
    const params = new URLSearchParams({ for: recipient });
    if (interestsParam) params.set("interests", interestsParam);
    if (budgetParam) params.set("budget", budgetParam);
    fetch(`/api/gifts?${params}`)
      .then((r) => r.json())
      .then((data) => { setResult(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [recipient, interestsParam, budgetParam]);

  function handleCheckPrice(productName: string) {
    router.push(`/results?q=${encodeURIComponent(productName)}`);
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/")} className="text-2xl hover:scale-110 transition-transform">🎁</button>
        <div>
          {recipientLabel && (
            <h1 className="text-base font-bold text-stone-900">
              {recipientLabel.emoji} Gifts for {recipientLabel.label}
              {budgetParam ? ` · Under $${budgetParam}` : ""}
            </h1>
          )}
          {interestLabels.length > 0 && (
            <p className="text-xs text-stone-400">
              {interestLabels.map((i) => i?.label).join(" · ")}
            </p>
          )}
        </div>
        <button
          onClick={() => router.push("/")}
          className="ml-auto text-xs text-stone-400 hover:text-stone-600 underline"
        >
          Start over
        </button>
      </div>

      {loading && (
        <div>
          <div className="h-4 w-48 bg-stone-100 rounded-full mb-6 animate-pulse" />
          <Skeleton />
        </div>
      )}

      {!loading && result && (
        <>
          {result.products.length > 0 ? (
            <>
              <p className="text-sm text-stone-400 mb-5">
                <span className="text-stone-700 font-medium">{result.products.length} gift ideas</span> found. Tap any to explore — or check if it&apos;s the best price.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {result.products.map((product) => (
                  <GiftCard
                    key={product.sku}
                    product={product}
                    onCheckPrice={handleCheckPrice}
                  />
                ))}
              </div>

              {/* Amazon fallback */}
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">More ideas on Amazon</p>
                  <p className="text-xs text-stone-400">Millions of gift options</p>
                </div>
                <a
                  href={result.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors"
                >
                  Browse →
                </a>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🤔</div>
              <p className="font-semibold text-stone-700 mb-2">No results found for this combination</p>
              <p className="text-sm text-stone-400 mb-6">Try adjusting the interests or budget.</p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-2xl text-sm transition-colors"
              >
                Try Again
              </button>
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
    <Suspense>
      <FindContent />
    </Suspense>
  );
}
