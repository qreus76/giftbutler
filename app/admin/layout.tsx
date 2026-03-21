import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import AdminNav from "./components/AdminNav";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) redirect("/");

  return (
    <div className="min-h-screen bg-[#EAEAE0]">
      {/* Top nav */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#E0E0D8] shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#111111] text-base">GiftButler</span>
              <span className="text-[#CCCCCC]">/</span>
              <span className="text-sm font-semibold text-[#888888]">Admin</span>
            </div>
            <Link href="/home" className="flex items-center gap-1.5 text-xs font-medium text-[#888888] hover:text-[#111111] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to app
            </Link>
          </div>
          <AdminNav />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
