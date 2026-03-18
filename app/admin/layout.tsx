import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/health", label: "Health" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) redirect("/");

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-48 min-h-screen bg-stone-900 border-r border-stone-800 flex flex-col px-3 py-6 flex-shrink-0">
          <div className="mb-8 px-3">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">GiftButler</p>
            <p className="text-xs text-stone-500 mt-0.5">Admin</p>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 rounded-xl text-sm font-medium text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-3">
            <Link href="/dashboard" className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
              ← Back to app
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
