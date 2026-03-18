import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GiftButler — Stop answering 'what do you want?' Just send your link.",
  description: "Drop hints about your life. Share your link. Get gifts you actually want.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#fbbf24",        // amber-400
          colorText: "#1c1917",           // stone-900
          colorTextSecondary: "#78716c",  // stone-500
          colorBackground: "#fafaf9",     // stone-50
          colorInputBackground: "#ffffff",
          colorInputText: "#1c1917",
          borderRadius: "0.75rem",        // rounded-xl
          fontFamily: "var(--font-geist-sans), sans-serif",
        },
        elements: {
          card: "shadow-sm border border-stone-200",
          headerTitle: "text-stone-900 font-bold",
          headerSubtitle: "text-stone-500",
          socialButtonsBlockButton: {
            className: "border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold rounded-xl",
            style: { padding: "12px 16px" },
          },
          formButtonPrimary: {
            className: "bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-xl shadow-none",
            style: { padding: "12px 24px" },
          },
          formFieldInput: {
            className: "border-stone-200 rounded-xl focus:ring-amber-400",
            style: { padding: "10px 16px" },
          },
          footerActionLink: "text-amber-600 hover:text-amber-700 font-semibold",
          identityPreviewEditButton: "text-amber-600",
          formResendCodeLink: "text-amber-600",
        },
      }}
    >
      <html lang="en">
        <body className={geist.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
