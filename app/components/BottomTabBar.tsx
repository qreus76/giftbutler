"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Users, Gift, Bell, User } from "lucide-react";

interface Props {
  myUsername: string;
  followCount?: number;
}

export default function BottomTabBar({ myUsername, followCount = 0 }: Props) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) return null;

  const tabs = [
    {
      href: "/my-people",
      icon: Users,
      label: "People",
      active: pathname === "/my-people",
      badge: 0,
    },
    {
      href: myUsername ? `/for/${myUsername}` : "/activity",
      icon: Gift,
      label: "Wishlist",
      active: myUsername ? pathname === `/for/${myUsername}` : false,
      badge: 0,
    },
    {
      href: "/activity",
      icon: Bell,
      label: "Activity",
      active: pathname.startsWith("/activity"),
      badge: followCount,
    },
    {
      href: "/profile/edit",
      icon: User,
      label: "Profile",
      active: pathname.startsWith("/profile"),
      badge: 0,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E5D9CC]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-xl mx-auto flex items-stretch h-16">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:opacity-60 duration-100 ${
              tab.active ? "text-[#6B2437]" : "text-[#7A6A5E] hover:text-[#1A1410]"
            }`}
          >
            <div className="relative">
              <tab.icon className={`w-5 h-5 ${tab.active ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-[#922B21] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${tab.active ? "font-semibold" : ""}`}>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
