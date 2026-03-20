"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FollowRequestProvider, useFollowRequests } from "@/lib/follow-request-context";
import BottomTabBar from "@/app/components/BottomTabBar";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [username, setUsername] = useState("");
  const { followRequests } = useFollowRequests();

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.profile?.username) setUsername(d.profile.username);
    });
  }, [isLoaded, user]);

  return (
    <>
      <nav className="border-b border-amber-100/70 bg-[#fef9ef] sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={username ? `/for/${username}` : "/activity"} className="text-base font-display text-stone-900 tracking-wide">
            GiftButler
          </Link>
          {isLoaded && user && (
            <Link href="/profile/edit" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-amber-400 transition-all flex-shrink-0">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-stone-900" style={{ background: "linear-gradient(135deg, #E8A000, #FFD166)" }}>
                  {user.firstName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </Link>
          )}
        </div>
      </nav>

      <div className="pb-24">
        {children}
      </div>

      {isLoaded && user && (
        <BottomTabBar myUsername={username} followCount={followRequests.length} />
      )}
    </>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <FollowRequestProvider>
      <AppLayout>{children}</AppLayout>
    </FollowRequestProvider>
  );
}
