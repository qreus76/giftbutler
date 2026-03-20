"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Users, Bell } from "lucide-react";
import { FollowRequestProvider, useFollowRequests } from "@/lib/follow-request-context";

function SharedNav() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [username, setUsername] = useState("");
  const { followRequests } = useFollowRequests();

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.profile?.username) setUsername(d.profile.username);
    });
  }, [isLoaded, user]);

  const onMyPeople = pathname === "/my-people";
  const onActivity = pathname.startsWith("/activity");

  return (
    <nav className="border-b border-amber-100/70 bg-[#fef9ef] sticky top-0 z-10">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href={username ? `/for/${username}` : "/dashboard"} className="text-base font-display text-stone-900 tracking-wide">GiftButler</Link>
        {isLoaded && user && (
          <div className="flex items-center gap-2">
            <Link
              href="/my-people"
              title="My People"
              aria-label="My People"
              className={`p-2 hover:bg-stone-100 rounded-xl transition-colors ${onMyPeople ? "text-amber-600" : "text-stone-400 hover:text-stone-700"}`}
            >
              <Users className="w-5 h-5" />
            </Link>
            <Link
              href="/activity"
              title="Activity"
              aria-label="Activity"
              className={`relative p-2 hover:bg-stone-100 rounded-xl transition-colors ${onActivity ? "text-amber-600" : "text-stone-400 hover:text-stone-700"}`}
            >
              <Bell className="w-5 h-5" />
              {followRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {followRequests.length}
                </span>
              )}
            </Link>
            <Link
              href="/profile/edit"
              title="Edit profile"
              aria-label="Edit profile"
              className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-amber-400 transition-all flex-shrink-0"
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-amber-400 flex items-center justify-center text-xs font-bold text-stone-900">
                  {user?.firstName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <FollowRequestProvider>
      <SharedNav />
      {children}
    </FollowRequestProvider>
  );
}
