import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ success: true }); // silently skip if not configured
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { recipient_username, occasion } = body;
  if (!recipient_username) return NextResponse.json({ error: "Missing recipient_username" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, username")
    .eq("username", recipient_username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(profile.id);
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return NextResponse.json({ success: true });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
    const profileUrl = `${baseUrl}/for/${profile.username}`;
    const displayName = escapeHtml(profile.name || profile.username);
    const occasionText = occasion ? ` for your ${escapeHtml(occasion)}` : "";
    const subject = `Someone has a gift on the way for you${occasionText}`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GiftButler <notifications@giftbutler.io>",
        to: [email],
        subject,
        text: `Hi ${profile.name || profile.username},\n\nSomeone is planning a gift for you${occasionText}. We'll keep the details a surprise — but your hints are working!\n\nAdd more hints at: ${profileUrl}\n\n---\nGiftButler · To stop these notifications, email privacy@giftbutler.io`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
            <p style="font-size: 28px; margin: 0 0 4px;">🎁</p>
            <h1 style="font-size: 24px; font-weight: 800; color: #1c1917; margin: 0 0 8px;">Something is on the way</h1>
            <p style="color: #78716c; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
              Hi ${displayName} — someone is planning a gift for you${occasionText}.
              We&apos;ll keep the details a surprise, but your hints are working!
            </p>
            <a href="${profileUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
              Add more hints →
            </a>
            <p style="color: #a8a29e; font-size: 12px; margin: 32px 0 0; line-height: 1.6;">
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
  } catch (err) {
    console.error("[claims notify] Failed:", err);
  }

  return NextResponse.json({ success: true });
}
