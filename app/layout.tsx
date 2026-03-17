import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GiftButler — Find the Best Price for Any Gift",
  description: "Stop overpaying. GiftButler finds real prices across Amazon and eBay so you always know when you're getting a deal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
