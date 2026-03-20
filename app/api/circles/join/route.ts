import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const { data: circle } = await supabaseAdmin
    .from("gift_circles")
    .select("id, name, budget, event_date, status, organizer_id")
    .eq("invite_code", code)
    .single();

  if (!circle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { count } = await supabaseAdmin
    .from("gift_circle_members")
    .select("*", { count: "exact", head: true })
    .eq("circle_id", circle.id);

  const { data: organizer } = await supabaseAdmin
    .from("profiles")
    .select("name, username")
    .eq("id", circle.organizer_id)
    .single();

  return NextResponse.json({
    circle: {
      ...circle,
      memberCount: count || 0,
      organizerName: organizer?.name || organizer?.username || "Someone",
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const { data: circle } = await supabaseAdmin
    .from("gift_circles")
    .select("*")
    .eq("invite_code", code)
    .single();

  if (!circle) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  if (circle.status !== "open") return NextResponse.json({ error: "This circle has already drawn names" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("gift_circle_members")
    .select("id")
    .eq("circle_id", circle.id)
    .eq("user_id", userId)
    .single();

  if (existing) return NextResponse.json({ circle, alreadyMember: true });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });

  await supabaseAdmin.from("gift_circle_members").insert({
    circle_id: circle.id,
    user_id: userId,
  });

  return NextResponse.json({ circle, joined: true });
}
