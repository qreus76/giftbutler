import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — GiftButler",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-7xl font-black text-amber-400 mb-4">404</p>
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Nothing here</h1>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          This profile or page doesn&apos;t exist — but yours could.
          Drop hints, share your link, and get gifts you actually want.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-sm transition-colors"
          >
            Create my free profile →
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-stone-200 hover:border-stone-300 text-stone-600 font-semibold rounded-2xl text-sm transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
      <Link href="/" className="mt-12 text-sm font-bold text-stone-300 hover:text-stone-500 transition-colors">
        GiftButler
      </Link>
    </main>
  );
}
