import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { recipient_username, gift_description, occasion } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", recipient_username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const session = req.headers.get("x-forwarded-for") || "anonymous";

  await supabase.from("claims").insert({
    recipient_user_id: profile.id,
    gift_description,
    claimer_session: session,
    occasion: occasion || null,
  });

  return NextResponse.json({ success: true });
}
