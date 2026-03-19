import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/follows/requests — get pending follow requests for the current user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all pending requests where I am the receiver
  const { data: follows, error } = await supabaseAdmin
    .from("follows")
    .select("requester_id, created_at")
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!follows || follows.length === 0) return NextResponse.json({ requests: [] });

  // Get profiles from Supabase for each requester
  const requesterIds = follows.map(f => f.requester_id);
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name")
    .in("id", requesterIds);

  // Get avatars from Clerk
  const clerk = await clerkClient();
  const requests = await Promise.all(
    follows.map(async (follow) => {
      const profile = profiles?.find(p => p.id === follow.requester_id);
      let avatar: string | null = null;
      try {
        const clerkUser = await clerk.users.getUser(follow.requester_id);
        avatar = clerkUser.imageUrl || null;
      } catch { /* user not found in Clerk */ }
      return {
        requester_id: follow.requester_id,
        name: profile?.name || profile?.username || "Someone",
        username: profile?.username || "",
        avatar,
      };
    })
  );

  return NextResponse.json({ requests });
}
