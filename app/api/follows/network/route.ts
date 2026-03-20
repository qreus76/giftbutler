import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getDaysUntilBirthday } from "@/lib/utils";

// GET /api/follows/network — get all accepted connections with profile + birthday info
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all accepted follows in either direction
  const { data: follows, error } = await supabaseAdmin
    .from("follows")
    .select("requester_id, receiver_id, requester_label, receiver_label, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!follows || follows.length === 0) return NextResponse.json({ people: [] });

  // For each follow, get the other person's id and my label for them
  const connections = follows.map(f => {
    const iRequested = f.requester_id === userId;
    return {
      otherId: iRequested ? f.receiver_id : f.requester_id,
      myLabel: iRequested ? f.requester_label : f.receiver_label,
    };
  });

  const otherIds = connections.map(c => c.otherId);

  // Get profiles from Supabase
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name, bio, birthday")
    .in("id", otherIds);

  // Get avatars from Clerk
  const clerk = await clerkClient();
  const people = await Promise.all(
    connections.map(async ({ otherId, myLabel }) => {
      const profile = profiles?.find(p => p.id === otherId);
      let avatar: string | null = null;
      try {
        const clerkUser = await clerk.users.getUser(otherId);
        avatar = clerkUser.hasImage ? clerkUser.imageUrl : null;
      } catch { /* not found */ }

      const daysUntilBirthday = profile?.birthday ? getDaysUntilBirthday(profile.birthday) : null;

      return {
        id: otherId,
        username: profile?.username || "",
        name: profile?.name || profile?.username || "Someone",
        avatar,
        birthday: profile?.birthday || null,
        daysUntilBirthday,
        myLabel,
      };
    })
  );

  // Sort: people with birthdays first (nearest first), then no birthday
  people.sort((a, b) => {
    if (a.daysUntilBirthday === null && b.daysUntilBirthday === null) return 0;
    if (a.daysUntilBirthday === null) return 1;
    if (b.daysUntilBirthday === null) return -1;
    return a.daysUntilBirthday - b.daysUntilBirthday;
  });

  return NextResponse.json({ people });
}
