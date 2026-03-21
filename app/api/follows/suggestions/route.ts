import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get my profile (for referred_by)
  const { data: myProfile } = await supabaseAdmin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .single();

  // Get my confirmed connection IDs
  const { data: myFollows } = await supabaseAdmin
    .from("follows")
    .select("requester_id, receiver_id")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq("status", "accepted");

  const myConnIds = (myFollows || []).map(f =>
    f.requester_id === userId ? f.receiver_id : f.requester_id
  );

  // Get pending follow IDs (so we don't suggest people we already requested)
  const { data: pendingFollows } = await supabaseAdmin
    .from("follows")
    .select("requester_id, receiver_id")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq("status", "pending");

  const pendingIds = (pendingFollows || []).map(f =>
    f.requester_id === userId ? f.receiver_id : f.requester_id
  );

  const excludeIds = new Set([userId, ...myConnIds, ...pendingIds]);

  const clerk = await clerkClient();

  // Fetch referred_by profile (if any and not already connected)
  let referred: { id: string; username: string; name: string; avatar: string | null } | null = null;
  if (myProfile?.referred_by) {
    const { data: referredProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, username, name")
      .eq("username", myProfile.referred_by)
      .single();

    if (referredProfile && !excludeIds.has(referredProfile.id)) {
      let avatar: string | null = null;
      try {
        const clerkUser = await clerk.users.getUser(referredProfile.id);
        avatar = clerkUser.hasImage ? clerkUser.imageUrl : null;
      } catch { /* not found */ }
      referred = { id: referredProfile.id, username: referredProfile.username, name: referredProfile.name || referredProfile.username, avatar };
      excludeIds.add(referredProfile.id);
    }
  }

  // Second-degree: get connections of my connections
  if (myConnIds.length === 0) {
    return NextResponse.json({ referred, suggestions: [] });
  }

  const { data: secondDegreeFollows } = await supabaseAdmin
    .from("follows")
    .select("requester_id, receiver_id")
    .eq("status", "accepted")
    .or(`requester_id.in.(${myConnIds.join(",")}),receiver_id.in.(${myConnIds.join(",")})`);

  // Count how many of my connections each candidate is connected to
  const mutualMap = new Map<string, number>();
  for (const f of (secondDegreeFollows || [])) {
    const isRequester = myConnIds.includes(f.requester_id);
    const candidateId = isRequester ? f.receiver_id : f.requester_id;
    if (!excludeIds.has(candidateId)) {
      mutualMap.set(candidateId, (mutualMap.get(candidateId) || 0) + 1);
    }
  }

  if (mutualMap.size === 0) return NextResponse.json({ referred, suggestions: [] });

  // Get top candidates by mutual count
  const topCandidates = [...mutualMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  const { data: candidateProfiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name")
    .in("id", topCandidates);

  const suggestions = await Promise.all(
    (candidateProfiles || []).map(async (profile) => {
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
        mutualCount: mutualMap.get(profile.id) || 0,
      };
    })
  );

  suggestions.sort((a, b) => b.mutualCount - a.mutualCount);

  return NextResponse.json({ referred, suggestions });
}
