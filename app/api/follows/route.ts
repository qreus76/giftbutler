import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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

  // Send follow request notification email (fire and forget)
  if (process.env.RESEND_API_KEY) {
    (async () => {
      try {
        const clerk = await clerkClient();

        // Get requester's name/username for the email
        const requesterProfile = await supabaseAdmin
          .from("profiles")
          .select("name, username")
          .eq("id", userId)
          .single();
        const requesterName = requesterProfile.data?.name || requesterProfile.data?.username || "Someone";

        // Get receiver's email from Clerk
        const receiverUser = await clerk.users.getUser(profile.id);
        const receiverEmail = receiverUser.emailAddresses[0]?.emailAddress;
        if (!receiverEmail) return;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
        const dashboardUrl = `${baseUrl}/dashboard`;
        const safeRequesterName = escapeHtml(requesterName);

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "GiftButler <notifications@giftbutler.io>",
            to: [receiverEmail],
            subject: `${requesterName} wants to add you to their people`,
            text: `${requesterName} sent you a connection request on GiftButler. Accept or decline at: ${dashboardUrl}\n\n---\nGiftButler · To stop these notifications, email privacy@giftbutler.io`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
                <h1 style="font-size: 24px; font-weight: 800; color: #1c1917; margin: 0 0 8px;">👋 New connection request</h1>
                <p style="color: #78716c; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                  <strong style="color: #1c1917;">${safeRequesterName}</strong> wants to add you to their people on GiftButler.
                  Head to your dashboard to accept or decline.
                </p>
                <a href="${dashboardUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
                  View request →
                </a>
                <p style="color: #a8a29e; font-size: 12px; margin: 32px 0 0;">
                  GiftButler · Free forever<br/>
                  To stop these notifications, email <a href="mailto:privacy@giftbutler.io" style="color: #a8a29e;">privacy@giftbutler.io</a>
                </p>
              </div>
            `,
            headers: {
              "List-Unsubscribe": `<mailto:privacy@giftbutler.io?subject=Unsubscribe>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });
      } catch (err) { console.error("[follow request email] Failed:", err); }
    })();
  }

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

  // Send acceptance notification email (fire and forget)
  if (action === "accept" && process.env.RESEND_API_KEY) {
    (async () => {
      try {
        const clerk = await clerkClient();

        // Get accepter's name for the email
        const accepterProfile = await supabaseAdmin
          .from("profiles")
          .select("name, username")
          .eq("id", userId)
          .single();
        const accepterName = accepterProfile.data?.name || accepterProfile.data?.username || "Someone";

        // Get requester's email from Clerk
        const requesterUser = await clerk.users.getUser(requester_id);
        const requesterEmail = requesterUser.emailAddresses[0]?.emailAddress;
        if (!requesterEmail) return;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
        const myPeopleUrl = `${baseUrl}/my-people`;
        const safeAccepterName = escapeHtml(accepterName);

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "GiftButler <notifications@giftbutler.io>",
            to: [requesterEmail],
            subject: `${accepterName} accepted your connection request`,
            text: `${accepterName} accepted your request and is now in your people on GiftButler. View your people at: ${myPeopleUrl}\n\n---\nGiftButler · To stop these notifications, email privacy@giftbutler.io`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
                <h1 style="font-size: 24px; font-weight: 800; color: #1c1917; margin: 0 0 8px;">✓ Connection accepted</h1>
                <p style="color: #78716c; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                  <strong style="color: #1c1917;">${safeAccepterName}</strong> accepted your request and is now in your people.
                  You'll see their birthday coming up so you never miss the moment.
                </p>
                <a href="${myPeopleUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
                  View my people →
                </a>
                <p style="color: #a8a29e; font-size: 12px; margin: 32px 0 0;">
                  GiftButler · Free forever<br/>
                  To stop these notifications, email <a href="mailto:privacy@giftbutler.io" style="color: #a8a29e;">privacy@giftbutler.io</a>
                </p>
              </div>
            `,
            headers: {
              "List-Unsubscribe": `<mailto:privacy@giftbutler.io?subject=Unsubscribe>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });
      } catch (err) { console.error("[follow accept email] Failed:", err); }
    })();
  }

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
