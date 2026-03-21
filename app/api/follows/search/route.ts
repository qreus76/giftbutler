import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  // Get all my follows to determine connection IDs and follow statuses
  const { data: allMyFollows } = await supabaseAdmin
    .from("follows")
    .select("requester_id, receiver_id, status")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  const myConnIds = (allMyFollows || [])
    .filter(f => f.status === "accepted")
    .map(f => f.requester_id === userId ? f.receiver_id : f.requester_id);

  const followStatusMap = new Map<string, "accepted" | "pending">();
  for (const f of (allMyFollows || [])) {
    const otherId = f.requester_id === userId ? f.receiver_id : f.requester_id;
    followStatusMap.set(otherId, f.status as "accepted" | "pending");
  }

  // Search profiles by name OR username (case-insensitive partial match)
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name")
    .or(`username.ilike.%${q}%,name.ilike.%${q}%`)
    .neq("id", userId)
    .limit(20);

  if (!profiles || profiles.length === 0) return NextResponse.json({ results: [] });

  const resultIds = profiles.map(p => p.id);

  // Count mutual connections for each result
  const mutualMap = new Map<string, number>();
  if (myConnIds.length > 0) {
    const { data: resultFollows } = await supabaseAdmin
      .from("follows")
      .select("requester_id, receiver_id")
      .eq("status", "accepted")
      .or(`requester_id.in.(${resultIds.join(",")}),receiver_id.in.(${resultIds.join(",")})`);

    for (const f of (resultFollows || [])) {
      const inResults = resultIds.includes(f.requester_id);
      const resultId = inResults ? f.requester_id : f.receiver_id;
      const otherId = inResults ? f.receiver_id : f.requester_id;
      if (myConnIds.includes(otherId) && otherId !== userId) {
        mutualMap.set(resultId, (mutualMap.get(resultId) || 0) + 1);
      }
    }
  }

  // Get avatars from Clerk in parallel
  const clerk = await clerkClient();
  const withAvatars = await Promise.all(
    profiles.map(async (profile) => {
      let avatar: string | null = null;
      try {
        const clerkUser = await clerk.users.getUser(profile.id);
        avatar = clerkUser.hasImage ? clerkUser.imageUrl : null;
      } catch { /* not found */ }

      return {
        id: profile.id,
        username: profile.username,
        name: profile.name || profile.username,
        avatar,
        followStatus: followStatusMap.get(profile.id) || "none" as "none" | "accepted" | "pending",
        mutualCount: mutualMap.get(profile.id) || 0,
      };
    })
  );

  // Sort: mutuals descending, then alphabetical
  withAvatars.sort((a, b) => {
    if (b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ results: withAvatars.slice(0, 10) });
}
