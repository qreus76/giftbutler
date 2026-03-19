import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ redirect: "/onboarding" });
  }

  const { data: hints } = await supabase
    .from("hints")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Get visit count from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: visitCount } = await supabaseAdmin
    .from("profile_visits")
    .select("*", { count: "exact", head: true })
    .eq("profile_user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Recent visits for the feed (last 10)
  const { data: recentVisits } = await supabaseAdmin
    .from("profile_visits")
    .select("created_at, device_type, referrer")
    .eq("profile_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Gift claims count
  const { count: claimCount } = await supabaseAdmin
    .from("claims")
    .select("*", { count: "exact", head: true })
    .eq("recipient_user_id", userId);

  return NextResponse.json({ profile, hints: hints || [], visitCount: visitCount || 0, recentVisits: recentVisits || [], claimCount: claimCount || 0 });
}
