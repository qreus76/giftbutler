import type { Metadata } from "next";
import { Geist, DM_Serif_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { RotateCcw } from "lucide-react";
import ScrollToTop from "@/app/components/ScrollToTop";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io"),
  title: "GiftButler — No more guessing. Just the right gift.",
  description: "Drop hints. Share your link. Get gifts you actually want.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GiftButler",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "GiftButler — No more guessing. Just the right gift.",
    description: "Drop hints. Share your link. Get gifts you actually want.",
    siteName: "GiftButler",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GiftButler" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GiftButler — No more guessing. Just the right gift.",
    description: "Drop hints. Share your link. Get gifts you actually want.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#111111",
          colorText: "#111111",
          colorTextSecondary: "#888888",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#111111",
          borderRadius: "1rem",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        elements: {
          card: "shadow-float border-0",
          headerTitle: "text-[#111111] font-bold",
          headerSubtitle: "text-[#888888]",
          socialButtonsBlockButton: {
            className: "border border-[#E0E0E0] hover:bg-[#F5F5F0] text-[#111111] font-semibold rounded-full",
            style: { padding: "12px 16px" },
          },
          formButtonPrimary: {
            className: "bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full shadow-none",
            style: { padding: "12px 24px" },
          },
          formFieldInput: {
            className: "border border-[#E0E0E0] rounded-xl focus:ring-[#111111] focus:border-[#111111]",
            style: { padding: "10px 16px" },
          },
          footerActionLink: "text-[#111111] font-semibold underline",
          identityPreviewEditButton: "text-[#888888]",
          formResendCodeLink: "text-[#888888]",
        },
      }}
    >
      <html lang="en">
        <body className={`${geist.className} ${dmSerif.variable}`}>
          <ScrollToTop />
          {/* Landscape orientation warning — mobile only */}
          <div className="rotate-warning fixed inset-0 z-50 bg-stone-900 flex-col items-center justify-center text-center px-8">
            <RotateCcw className="w-12 h-12 text-white mb-4 mx-auto" />
            <p className="text-white font-bold text-xl mb-2">Please rotate your phone</p>
            <p className="text-stone-400 text-sm">GiftButler works best in portrait mode</p>
          </div>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
