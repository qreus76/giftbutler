import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/follows?username=xxx — get follow status between current user and a profile
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ status: "none" });

  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  // Get the profile id for this username
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Check follow status in either direction
  const { data: follow } = await supabaseAdmin
    .from("follows")
    .select("*")
    .or(`and(requester_id.eq.${userId},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${userId})`)
    .single();

  if (!follow) return NextResponse.json({ status: "none" });

  const iRequested = follow.requester_id === userId;
  return NextResponse.json({
    status: follow.status,
    iRequested,
    myLabel: iRequested ? follow.requester_label : follow.receiver_label,
  });
}

// POST /api/follows — send a follow request
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, label } = await req.json();
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (profile.id === userId) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  // Upsert — handles re-requesting after a rejection
  const { error } = await supabaseAdmin
    .from("follows")
    .upsert({
      requester_id: userId,
      receiver_id: profile.id,
      requester_label: label || null,
      status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "requester_id,receiver_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PATCH /api/follows — accept or reject a request, or set receiver label
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requester_id, action, label } = await req.json();
  if (!requester_id || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const updates: Record<string, string> = {
    status: action === "accept" ? "accepted" : "rejected",
    updated_at: new Date().toISOString(),
  };
  if (action === "accept" && label) updates.receiver_label = label;

  const { error } = await supabaseAdmin
    .from("follows")
    .update(updates)
    .eq("requester_id", requester_id)
    .eq("receiver_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/follows — remove a connection
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Remove in either direction
  await supabaseAdmin
    .from("follows")
    .delete()
    .or(`and(requester_id.eq.${userId},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${userId})`);

  return NextResponse.json({ success: true });
}
