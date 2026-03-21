import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: circle } = await supabaseAdmin
    .from("gift_circles")
    .select("*")
    .eq("id", id)
    .single();

  if (!circle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from("gift_circle_members")
    .select("*")
    .eq("circle_id", id)
    .eq("user_id", userId)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: members } = await supabaseAdmin
    .from("gift_circle_members")
    .select("*")
    .eq("circle_id", id);

  const memberIds = (members || []).map((m: { user_id: string }) => m.user_id);

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name, avatar_url")
    .in("id", memberIds);

  const profileMap = Object.fromEntries((profiles || []).map((p: { id: string; username: string; name: string; avatar_url: string | null }) => [p.id, p]));

  const clerk = await clerkClient();
  const enrichedMembers = await Promise.all(
    (members || []).map(async (m: { user_id: string; assigned_to_id: string | null }) => {
      const profile = profileMap[m.user_id] as { id: string; username: string; name: string; avatar_url: string | null } | undefined;
      let avatar = profile?.avatar_url || null;
      try {
        const clerkUser = await clerk.users.getUser(m.user_id);
        if (clerkUser.hasImage) avatar = clerkUser.imageUrl;
      } catch {}
      return {
        userId: m.user_id,
        username: profile?.username || "",
        name: profile?.name || profile?.username || "",
        avatar,
      };
    })
  );

  let assignedTo = null;
  if (membership.assigned_to_id) {
    const { data: assignedProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, username, name, avatar_url")
      .eq("id", membership.assigned_to_id)
      .single();
    if (assignedProfile) {
      let avatar = assignedProfile.avatar_url || null;
      try {
        const clerkUser = await clerk.users.getUser(membership.assigned_to_id);
        if (clerkUser.hasImage) avatar = clerkUser.imageUrl;
      } catch {}
      assignedTo = { ...assignedProfile, avatar };
    }
  }

  // Fetch recipient profile for occasion circles
  let recipient = null;
  if (circle.circle_type === "occasion" && circle.recipient_username) {
    const { data: rp } = await supabaseAdmin
      .from("profiles").select("id, username, name, avatar_url")
      .eq("username", circle.recipient_username).single();
    if (rp) {
      let recipientAvatar = rp.avatar_url || null;
      try {
        const cu = await clerk.users.getUser(rp.id);
        if (cu.hasImage) recipientAvatar = cu.imageUrl;
      } catch {}
      recipient = { id: rp.id, username: rp.username, name: rp.name, avatar: recipientAvatar };
    }
  }

  return NextResponse.json({
    circle: {
      ...circle,
      isOrganizer: circle.organizer_id === userId,
      memberCount: members?.length || 0,
    },
    members: enrichedMembers,
    assignedTo,
    recipient,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: circle } = await supabaseAdmin
    .from("gift_circles")
    .select("organizer_id, status")
    .eq("id", id)
    .single();

  if (!circle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (circle.organizer_id === userId) {
    // Organizer deletes the whole circle
    await supabaseAdmin.from("gift_circles").delete().eq("id", id);
    return NextResponse.json({ deleted: true });
  }
  if (circle.status !== "open") return NextResponse.json({ error: "Cannot leave after names have been drawn" }, { status: 400 });

  await supabaseAdmin.from("gift_circle_members").delete().eq("circle_id", id).eq("user_id", userId);
  return NextResponse.json({ left: true });
}
