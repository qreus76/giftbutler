import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ occasions: [] });

  const { data: follows } = await supabase
    .from("follows").select("following_id").eq("follower_id", userId).eq("status", "accepted");

  if (!follows?.length) return NextResponse.json({ occasions: [] });

  const followingIds = follows.map((f: { following_id: string }) => f.following_id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const inSixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: occasions } = await supabaseAdmin
    .from("occasions").select("*")
    .in("user_id", followingIds)
    .gte("date", todayStr)
    .lte("date", inSixtyDays)
    .order("date", { ascending: true });

  if (!occasions?.length) return NextResponse.json({ occasions: [] });

  const userIds = [...new Set(occasions.map((o: { user_id: string }) => o.user_id))];
  const { data: profiles } = await supabase
    .from("profiles").select("id, username, name").in("id", userIds);

  const profileMap = Object.fromEntries((profiles || []).map((p: { id: string; username: string; name: string }) => [p.id, p]));

  return NextResponse.json({
    occasions: occasions.map((o: { id: string; user_id: string; name: string; date: string }) => {
      const target = new Date(o.date + "T00:00:00");
      const daysUntil = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: o.id,
        user_id: o.user_id,
        name: o.name,
        date: o.date,
        username: profileMap[o.user_id]?.username || null,
        person_name: profileMap[o.user_id]?.name || null,
        days_until: daysUntil,
      };
    }),
  });
}
