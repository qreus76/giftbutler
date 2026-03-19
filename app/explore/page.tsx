import type { Metadata } from "next";
import Link from "next/link";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getDaysUntilBirthday } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Explore gift profiles — GiftButler",
  description: "Browse GiftButler profiles and find the perfect gift for someone you love.",
};

export default async function ExplorePage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  // Get profiles with at least 1 hint, ordered by hint count
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("username, name, bio, birthday, id")
    .order("created_at", { ascending: false })
    .limit(48);

  // Get hint counts for each profile
  const profileIds = (profiles || []).map(p => p.id);
  const { data: hintCounts } = profileIds.length > 0
    ? await supabaseAdmin
        .from("hints")
        .select("user_id")
        .in("user_id", profileIds)
    : { data: [] };

  const countMap: Record<string, number> = {};
  for (const row of hintCounts || []) {
    countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
  }

  // Only show profiles with at least 3 hints
  const featured = (profiles || [])
    .filter(p => (countMap[p.id] || 0) >= 3)
    .sort((a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0))
    .slice(0, 24);

  // Batch fetch avatars from Clerk
  const avatarMap: Record<string, string | null> = {};
  if (featured.length > 0) {
    try {
      const clerk = await clerkClient();
      const clerkUsers = await clerk.users.getUserList({ userId: featured.map(p => p.id), limit: 24 });
      for (const u of clerkUsers.data) {
        avatarMap[u.id] = u.imageUrl || null;
      }
    } catch { /* avatars not critical */ }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto border-b border-stone-100">
        <Link href={isSignedIn ? "/my-people" : "/"} className="text-xl font-bold text-stone-900">GiftButler</Link>
        {isSignedIn ? (
          <Link href="/dashboard" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">
            My dashboard →
          </Link>
        ) : (
          <Link href="/sign-up" className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">
            Create my profile →
          </Link>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Explore profiles</h1>
          <p className="text-stone-500">Browse gift profiles and find something perfect for someone you love.</p>
        </div>

        {featured.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-4xl mb-4">🎁</p>
            <p className="font-medium text-stone-600 mb-2">No profiles yet</p>
            <p className="text-sm mb-6">{isSignedIn ? "Share your profile link to get things started." : "Be the first to create yours."}</p>
            {!isSignedIn && (
              <Link href="/sign-up" className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-2xl text-sm transition-colors">
                Create my free profile →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {featured.map((profile) => {
              const hintCount = countMap[profile.id] || 0;
              const days = profile.birthday ? getDaysUntilBirthday(profile.birthday) : null;
              const birthdaySoon = days !== null && days <= 30;
              const displayName = profile.name || profile.username;
              const avatar = avatarMap[profile.id] || null;

              return (
                <Link
                  key={profile.username}
                  href={`/for/${profile.username}`}
                  className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {avatar ? (
                          <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-amber-400 flex items-center justify-center text-sm font-bold text-stone-900">
                            {displayName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-sm">{displayName}</p>
                        <p className="text-stone-400 text-xs">@{profile.username}</p>
                      </div>
                    </div>
                    {birthdaySoon && (
                      <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        🎂 {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d`}
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-stone-500 text-xs leading-relaxed mb-3 line-clamp-2">{profile.bio}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400">{hintCount} hint{hintCount !== 1 ? "s" : ""}</span>
                    <span className="text-xs font-semibold text-amber-600 group-hover:text-amber-700">Find a gift →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA — signed-out visitors only */}
        {!isSignedIn && (
          <div className="mt-12 bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
            <h2 className="text-xl font-bold text-stone-900 mb-2">Create your own gift profile</h2>
            <p className="text-stone-500 text-sm mb-6">Drop hints. Share your link. Get gifts you actually want.</p>
            <Link href="/sign-up" className="inline-block px-8 py-3.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl transition-colors">
              Get started free →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
