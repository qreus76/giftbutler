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
          colorPrimary: "#FF9900",
          colorText: "#0F1111",
          colorTextSecondary: "#565959",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#0F1111",
          borderRadius: "0.5rem",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        elements: {
          card: "shadow-card border border-[#D5D9D9]",
          headerTitle: "text-[#0F1111] font-bold",
          headerSubtitle: "text-[#565959]",
          socialButtonsBlockButton: {
            className: "border-[#D5D9D9] hover:bg-[#EAEDED] text-[#0F1111] font-semibold rounded-lg",
            style: { padding: "12px 16px" },
          },
          formButtonPrimary: {
            className: "bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full shadow-none",
            style: { padding: "12px 24px" },
          },
          formFieldInput: {
            className: "border-[#D5D9D9] rounded-lg focus:ring-[#FF9900] focus:border-[#FF9900]",
            style: { padding: "10px 16px" },
          },
          footerActionLink: "text-[#007185] hover:text-[#C7511F] font-semibold underline",
          identityPreviewEditButton: "text-[#007185]",
          formResendCodeLink: "text-[#007185]",
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
