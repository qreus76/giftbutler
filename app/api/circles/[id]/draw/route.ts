import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

function shuffleAssignments(ids: string[]): Map<string, string> {
  if (ids.length < 2) throw new Error("Need at least 2 people");
  let shuffled = [...ids];
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 200) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    valid = shuffled.every((assignee, i) => assignee !== ids[i]);
    attempts++;
  }
  if (!valid) throw new Error("Could not create valid assignments");
  const result = new Map<string, string>();
  ids.forEach((id, i) => result.set(id, shuffled[i]));
  return result;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: circle } = await supabaseAdmin
    .from("gift_circles")
    .select("*")
    .eq("id", id)
    .single();

  if (!circle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (circle.organizer_id !== userId) return NextResponse.json({ error: "Only the organizer can draw names" }, { status: 403 });
  if (circle.status !== "open") return NextResponse.json({ error: "Already drawn" }, { status: 400 });

  const { data: members } = await supabaseAdmin
    .from("gift_circle_members")
    .select("user_id")
    .eq("circle_id", id);

  if (!members || members.length < 2) {
    return NextResponse.json({ error: "Need at least 2 members to draw names" }, { status: 400 });
  }

  const memberIds = members.map((m: { user_id: string }) => m.user_id);

  let assignments: Map<string, string>;
  try {
    assignments = shuffleAssignments(memberIds);
  } catch {
    return NextResponse.json({ error: "Could not create valid assignments" }, { status: 500 });
  }

  for (const [giverId, receiverId] of assignments) {
    await supabaseAdmin
      .from("gift_circle_members")
      .update({ assigned_to_id: receiverId })
      .eq("circle_id", id)
      .eq("user_id", giverId);
  }

  await supabaseAdmin.from("gift_circles").update({ status: "drawn" }).eq("id", id);

  // Fire-and-forget emails
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name")
    .in("id", memberIds);

  const profileMap = Object.fromEntries((profiles || []).map((p: { id: string; username: string; name: string }) => [p.id, p]));
  const clerk = await clerkClient();

  await Promise.all(
    memberIds.map(async (giverId: string) => {
      const receiverId = assignments.get(giverId)!;
      const receiverProfile = profileMap[receiverId] as { username: string; name: string } | undefined;
      try {
        const giverClerk = await clerk.users.getUser(giverId);
        const giverEmail = giverClerk.emailAddresses[0]?.emailAddress;
        if (!giverEmail) return;
        const receiverName = receiverProfile?.name || receiverProfile?.username || "someone";
        const profileUrl = `${baseUrl}/for/${receiverProfile?.username}`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "GiftButler <notifications@giftbutler.io>",
            to: [giverEmail],
            subject: `🎁 The draw is in — you got ${receiverName}!`,
            text: `The names have been drawn for ${circle.name}!\n\nYou're buying for: ${receiverName}${circle.budget ? `\nBudget: $${circle.budget}` : ""}\n\nView their wishlist: ${profileUrl}\n\n---\nGiftButler`,
            html: `
              <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#EAEAE0;">
                <h1 style="font-size:24px;font-weight:800;color:#111111;margin:0 0 4px;">🎁 The draw is in!</h1>
                <p style="color:#888888;font-size:14px;margin:0 0 24px;">${circle.name}</p>
                <div style="background:#ffffff;border-radius:16px;padding:24px;margin:0 0 20px;">
                  <p style="color:#888888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">You're buying for</p>
                  <p style="color:#111111;font-size:28px;font-weight:800;margin:0 0 8px;">${receiverName}</p>
                  ${circle.budget ? `<p style="color:#888888;font-size:14px;margin:0;">Budget: <strong style="color:#111111;">$${circle.budget}</strong></p>` : ""}
                </div>
                <a href="${profileUrl}" style="display:block;background:#111111;color:#ffffff;font-weight:700;font-size:15px;padding:14px 24px;border-radius:50px;text-decoration:none;text-align:center;">View their wishlist →</a>
                <p style="color:#CCCCCC;font-size:12px;margin:28px 0 0;text-align:center;">GiftButler &middot; <a href="${baseUrl}" style="color:#CCCCCC;">giftbutler.io</a></p>
              </div>`,
          }),
        });
      } catch {}
    })
  );

  return NextResponse.json({ success: true });
}
