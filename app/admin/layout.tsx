import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LayoutDashboard, BarChart2, Users, Activity, ArrowLeft } from "lucide-react";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);

const NAV = [
  { href: "/admin",            label: "Overview",  icon: LayoutDashboard },
  { href: "/admin/analytics",  label: "Analytics", icon: BarChart2 },
  { href: "/admin/users",      label: "Users",     icon: Users },
  { href: "/admin/health",     label: "Health",    icon: Activity },
];

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
          {/* Nav tabs — horizontally scrollable on mobile */}
          <nav className="flex gap-1 overflow-x-auto pb-px -mb-px scrollbar-none">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-3 text-sm font-semibold text-[#888888] hover:text-[#111111] border-b-2 border-transparent hover:border-[#111111] transition-colors whitespace-nowrap"
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
