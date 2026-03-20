import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/follows/search?q=username — search for a user by username
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) return NextResponse.json({ result: null });

  // Find profile by username
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name, birthday")
    .eq("username", q)
    .single();

  if (!profile) return NextResponse.json({ result: null });

  // Don't show yourself
  if (profile.id === userId) return NextResponse.json({ result: null, isSelf: true });

  // Get avatar from Clerk
  let avatar: string | null = null;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(profile.id);
    avatar = clerkUser.hasImage ? clerkUser.imageUrl : null;
  } catch { /* not found */ }

  // Check existing follow status
  const { data: follow } = await supabaseAdmin
    .from("follows")
    .select("status, requester_id")
    .or(`and(requester_id.eq.${userId},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${userId})`)
    .single();

  let followStatus: "none" | "pending" | "accepted" = "none";
  if (follow) {
    followStatus = follow.status === "accepted" ? "accepted" : "pending";
  }

  return NextResponse.json({
    result: {
      id: profile.id,
      username: profile.username,
      name: profile.name || profile.username,
      avatar,
      followStatus,
    },
  });
}
