import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

// Simple in-memory rate limiter: 5 claims per IP per hour
const claimsRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isClaimsRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = claimsRateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    claimsRateLimitMap.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

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
    .select("gift_description, occasion, created_at")
    .eq("recipient_user_id", profile.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ claims: claims || [] });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (isClaimsRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — try again later" }, { status: 429 });
  }

  const { userId: claimerUserId } = await auth();

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { recipient_username, gift_description, occasion } = body;

  if (!recipient_username || !gift_description?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (gift_description.trim().length > 300) {
    return NextResponse.json({ error: "Gift description too long" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, username")
    .eq("username", recipient_username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const session = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous";

  await supabaseAdmin.from("claims").insert({
    recipient_user_id: profile.id,
    gift_description,
    claimer_session: session,
    occasion: occasion || null,
  });

  // Send claimer confirmation email if they're logged in
  if (process.env.RESEND_API_KEY && claimerUserId) {
    (async () => {
      try {
        const clerk = await clerkClient();
        const claimerUser = await clerk.users.getUser(claimerUserId);
        const claimerEmail = claimerUser.emailAddresses[0]?.emailAddress;
        if (!claimerEmail) return;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
        const profileUrl = `${baseUrl}/for/${escapeHtml(recipient_username)}`;
        const occasionText = occasion ? ` for their ${escapeHtml(occasion)}` : "";
        const recipientName = escapeHtml(profile.name || recipient_username);
        const textBody = `You claimed "${gift_description}" for @${recipient_username}${occasionText}.\n\nYou can still browse more ideas at: ${profileUrl}\n\n---\nGiftButler`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "GiftButler <notifications@giftbutler.io>",
            to: [claimerEmail],
            subject: `You're getting ${recipientName} a gift`,
            text: textBody,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
                <h1 style="font-size: 24px; font-weight: 800; color: #1c1917; margin: 0 0 8px;">You&apos;re getting a gift</h1>
                <p style="color: #78716c; font-size: 15px; margin: 0 0 16px; line-height: 1.6;">
                  You claimed a gift for ${recipientName}${occasionText}. Consider it locked in!
                </p>
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
                  <p style="color: #92400e; font-size: 13px; font-weight: 600; margin: 0 0 4px;">Your claimed gift:</p>
                  <p style="color: #1c1917; font-size: 15px; font-weight: 700; margin: 0;">${escapeHtml(gift_description)}</p>
                </div>
                <a href="${profileUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
                  Browse more ideas
                </a>
                <p style="color: #a8a29e; font-size: 12px; margin: 32px 0 0;">
                  GiftButler · <a href="mailto:privacy@giftbutler.io" style="color: #a8a29e;">Unsubscribe</a>
                </p>
              </div>
            `,
            headers: {
              "List-Unsubscribe": `<mailto:privacy@giftbutler.io?subject=Unsubscribe>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });
      } catch (err) { console.error("[claimer confirmation email] Failed:", err); }
    })();
  }

  return NextResponse.json({ success: true });
}
