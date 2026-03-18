import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const username = new URL(req.url).searchParams.get("username");
  if (!username) return NextResponse.json({ claims: [] });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ claims: [] });

  const { data: claims } = await supabase
    .from("claims")
    .select("gift_description, created_at")
    .eq("recipient_user_id", profile.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ claims: claims || [] });
}

export async function POST(req: NextRequest) {
  const { recipient_username, gift_description, occasion } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", recipient_username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const session = req.headers.get("x-forwarded-for") || "anonymous";

  await supabaseAdmin.from("claims").insert({
    recipient_user_id: profile.id,
    gift_description,
    claimer_session: session,
    occasion: occasion || null,
  });

  return NextResponse.json({ success: true });
}
