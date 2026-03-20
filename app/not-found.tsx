import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — GiftButler",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#EAEAE0] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-7xl font-black text-[#C4D4B4] mb-4">404</p>
        <h1 className="text-2xl font-bold text-[#111111] mb-2">Nothing here</h1>
        <p className="text-[#888888] text-sm leading-relaxed mb-8">
          This profile or page doesn&apos;t exist — but yours could.
          Drop hints, share your link, and get gifts you actually want.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sign-up"
            className="px-6 py-3 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors"
          >
            Create my free profile →
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#555555] font-semibold rounded-full text-sm transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
      <Link href="/" className="mt-12 text-sm font-bold text-[#CCCCCC] hover:text-[#888888] transition-colors">
        GiftButler
      </Link>
    </main>
  );
}
