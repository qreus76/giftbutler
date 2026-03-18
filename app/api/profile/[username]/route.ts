import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: hints } = await supabase
    .from("hints")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  // Record visit (fire and forget)
  const visitorSession = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
  supabaseAdmin.from("profile_visits").insert({
    profile_user_id: profile.id,
    visitor_session: visitorSession,
  }).then(() => {});

  return NextResponse.json({ profile, hints: hints || [] });
}
