import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl mb-6">🎁</p>
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Nothing here</h1>
        <p className="text-stone-400 text-sm mb-8">This page doesn&apos;t exist — but a great gift profile does.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-2xl text-sm transition-colors"
          >
            Go home →
          </Link>
          <Link
            href="/explore"
            className="px-6 py-3 border border-stone-200 text-stone-500 font-semibold rounded-2xl text-sm hover:bg-stone-100 transition-colors"
          >
            Browse profiles
          </Link>
        </div>
      </div>
    </main>
  );
}
