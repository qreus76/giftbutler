import type { Metadata, Viewport } from "next";
import { Geist, DM_Serif_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { RotateCcw } from "lucide-react";
import ScrollToTop from "@/app/components/ScrollToTop";
import ServiceWorkerRegister from "@/app/components/ServiceWorkerRegister";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io"),
  title: "GiftButler — No more guessing. Just the right gift.",
  description: "Drop hints. Share your link. Get gifts you actually want.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GiftButler",
    startupImage: [
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-828x1792.png",  media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-750x1334.png",  media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
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
          colorInputBackground: "#F5F5F0",
          colorInputText: "#111111",
          colorNeutral: "#888888",
          borderRadius: "1.25rem",
          fontFamily: `${geist.style.fontFamily}, -apple-system, BlinkMacSystemFont, sans-serif`,
          fontSize: "15px",
        },
        elements: {
          card: "shadow-card border border-[#E8E8E0] rounded-2xl",
          headerTitle: "text-xl font-bold text-[#111111]",
          headerSubtitle: "text-sm text-[#888888]",
          socialButtonsBlockButton: {
            className: "border border-[#E0E0D8] hover:bg-[#F5F5F0] text-[#111111] font-semibold rounded-full text-sm",
            style: { padding: "11px 16px" },
          },
          formButtonPrimary: {
            className: "bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full shadow-none text-sm",
            style: { padding: "12px 24px" },
          },
          formFieldInput: {
            className: "border border-[#E0E0D8] rounded-xl text-[#111111] bg-[#F5F5F0]",
            style: { padding: "11px 16px", fontSize: "15px" },
          },
          formFieldLabel: "text-xs font-semibold text-[#888888] uppercase tracking-wide",
          footerActionLink: "text-[#111111] font-semibold",
          footerActionText: "text-[#888888] text-sm",
          identityPreviewEditButton: "text-[#888888]",
          formResendCodeLink: "text-[#111111] font-semibold",
          dividerLine: "bg-[#E8E8E0]",
          dividerText: "text-[#888888] text-xs",
        },
      }}
    >
      <html lang="en">
        <body className={`${geist.className} ${dmSerif.variable}`}>
          <ScrollToTop />
          <ServiceWorkerRegister />
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
