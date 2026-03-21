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

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    .select("gift_description, occasion, claimer_user_id, created_at")
    .eq("recipient_user_id", profile.id)
    .order("created_at", { ascending: false });

  // If authenticated, return which claims belong to the current user
  const { userId } = await auth();
  const myClaims = userId
    ? (claims || []).filter(c => c.claimer_user_id === userId).map(c => c.gift_description)
    : [];

  return NextResponse.json({ claims: claims || [], myClaims });
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

  const normalizedDescription = gift_description.trim().toLowerCase();
  const session = ip;

  const { error } = await supabaseAdmin.from("claims").insert({
    recipient_user_id: profile.id,
    gift_description: normalizedDescription,
    claimer_session: session,
    claimer_user_id: claimerUserId || null,
    occasion: occasion || null,
  });

  // Unique constraint violation — already claimed by someone else
  if (error?.code === "23505") {
    return NextResponse.json({ error: "Someone already claimed this item", alreadyClaimed: true }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: "Failed to claim" }, { status: 500 });

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

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "GiftButler <notifications@giftbutler.io>",
            to: [claimerEmail],
            subject: `You're getting ${recipientName} a gift`,
            text: `You claimed "${normalizedDescription}" for @${recipient_username}${occasionText}.\n\nYou can still browse more ideas at: ${profileUrl}\n\n---\nGiftButler`,
            html: `
              <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#EAEAE0;">
                <h1 style="font-size:24px;font-weight:800;color:#111111;margin:0 0 8px;">You&apos;re getting a gift</h1>
                <p style="color:#888888;font-size:15px;margin:0 0 16px;line-height:1.6;">You claimed a gift for ${recipientName}${occasionText}. Consider it locked in!</p>
                <div style="background:#ffffff;border-radius:16px;padding:16px;margin:0 0 24px;">
                  <p style="color:#888888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Your claimed gift</p>
                  <p style="color:#111111;font-size:15px;font-weight:700;margin:0;">${escapeHtml(normalizedDescription)}</p>
                </div>
                <a href="${profileUrl}" style="display:block;background:#111111;color:#ffffff;font-weight:700;font-size:14px;padding:14px 24px;border-radius:50px;text-decoration:none;text-align:center;">Browse more ideas</a>
                <p style="color:#CCCCCC;font-size:12px;margin:28px 0 0;text-align:center;">GiftButler &middot; <a href="mailto:privacy@giftbutler.io" style="color:#CCCCCC;">Unsubscribe</a></p>
              </div>`,
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

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { recipient_username, gift_description } = body;

  if (!recipient_username || !gift_description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", recipient_username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const normalizedDescription = gift_description.trim().toLowerCase();

  // Only delete if this user made the claim
  const { error } = await supabaseAdmin
    .from("claims")
    .delete()
    .eq("recipient_user_id", profile.id)
    .eq("gift_description", normalizedDescription)
    .eq("claimer_user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to release claim" }, { status: 500 });

  return NextResponse.json({ success: true });
}
