"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Users, Activity } from "lucide-react";

const NAV = [
  { href: "/admin",           label: "Overview",  icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/users",     label: "Users",     icon: Users },
  { href: "/admin/health",    label: "Health",    icon: Activity },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-px -mb-px scrollbar-none">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              active
                ? "text-[#111111] border-[#111111]"
                : "text-[#888888] border-transparent hover:text-[#111111] hover:border-[#CCCCCC]"
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
