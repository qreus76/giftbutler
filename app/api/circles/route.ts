import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabaseAdmin
    .from("gift_circle_members")
    .select("circle_id")
    .eq("user_id", userId);

  if (!memberships?.length) return NextResponse.json({ circles: [] });

  const circleIds = memberships.map((m: { circle_id: string }) => m.circle_id);

  const { data: circles } = await supabaseAdmin
    .from("gift_circles")
    .select("*")
    .in("id", circleIds)
    .order("created_at", { ascending: false });

  const { data: memberRows } = await supabaseAdmin
    .from("gift_circle_members")
    .select("circle_id")
    .in("circle_id", circleIds);

  const countMap: Record<string, number> = {};
  memberRows?.forEach((m: { circle_id: string }) => {
    countMap[m.circle_id] = (countMap[m.circle_id] || 0) + 1;
  });

  return NextResponse.json({
    circles: (circles || []).map((c: Record<string, unknown>) => ({
      ...c,
      memberCount: countMap[c.id as string] || 0,
      isOrganizer: c.organizer_id === userId,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, budget, eventDate, circleType, recipientUsername } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (budget && Number(budget) < 1) return NextResponse.json({ error: "Budget must be at least $1" }, { status: 400 });

  const inviteCode = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const type = circleType === "occasion" ? "occasion" : "exchange";

  const { data: circle, error } = await supabaseAdmin
    .from("gift_circles")
    .insert({
      name: name.trim(),
      budget: budget ? parseInt(budget) : null,
      event_date: eventDate || null,
      organizer_id: userId,
      status: "open",
      invite_code: inviteCode,
      circle_type: type,
      recipient_username: type === "occasion" ? (recipientUsername?.trim() || null) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create" }, { status: 500 });

  await supabaseAdmin.from("gift_circle_members").insert({
    circle_id: circle.id,
    user_id: userId,
  });

  return NextResponse.json({ circle });
}
