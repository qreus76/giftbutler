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
          colorPrimary: "#F59E0B",
          colorText: "#1C1E21",
          colorTextSecondary: "#65676B",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#1C1E21",
          borderRadius: "0.5rem",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        elements: {
          card: "shadow-card border border-[#E4E6EB]",
          headerTitle: "text-[#1C1E21] font-bold",
          headerSubtitle: "text-[#65676B]",
          socialButtonsBlockButton: {
            className: "border-[#E4E6EB] hover:bg-[#F0F2F5] text-[#1C1E21] font-semibold rounded-lg",
            style: { padding: "12px 16px" },
          },
          formButtonPrimary: {
            className: "bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold rounded-lg shadow-none",
            style: { padding: "12px 24px" },
          },
          formFieldInput: {
            className: "border-[#E4E6EB] rounded-lg focus:ring-[#F59E0B]",
            style: { padding: "10px 16px" },
          },
          footerActionLink: "text-[#F59E0B] hover:text-[#D97706] font-semibold",
          identityPreviewEditButton: "text-[#F59E0B]",
          formResendCodeLink: "text-[#F59E0B]",
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
