import type { Metadata } from "next";
import { Geist, DM_Serif_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { RotateCcw } from "lucide-react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io"),
  title: "GiftButler — Stop answering 'what do you want?' Just send your link.",
  description: "Drop hints about your life. Share your link. Get gifts you actually want.",
  icons: {
    icon: { url: "/logo.png", type: "image/png" },
    apple: { url: "/logo.png", type: "image/png" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6B2437",
          colorText: "#1A1410",
          colorTextSecondary: "#7A6A5E",
          colorBackground: "#FAF4EC",
          colorInputBackground: "#ffffff",
          colorInputText: "#1A1410",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-geist-sans), sans-serif",
        },
        elements: {
          card: "shadow-card border border-[#E5D9CC]",
          headerTitle: "text-[#1A1410] font-bold",
          headerSubtitle: "text-[#7A6A5E]",
          socialButtonsBlockButton: {
            className: "border-[#E5D9CC] hover:bg-[#EFE6DA] text-[#1A1410] font-semibold rounded-xl",
            style: { padding: "12px 16px" },
          },
          formButtonPrimary: {
            className: "bg-[#C08A3C] hover:bg-[#A87A32] text-white font-bold rounded-xl shadow-none",
            style: { padding: "12px 24px" },
          },
          formFieldInput: {
            className: "border-[#E5D9CC] rounded-xl focus:ring-[#C08A3C]",
            style: { padding: "10px 16px" },
          },
          footerActionLink: "text-[#6B2437] hover:text-[#4A1828] font-semibold",
          identityPreviewEditButton: "text-[#6B2437]",
          formResendCodeLink: "text-[#6B2437]",
        },
      }}
    >
      <html lang="en">
        <body className={`${geist.className} ${dmSerif.variable}`}>
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
