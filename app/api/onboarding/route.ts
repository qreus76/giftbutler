import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const RESERVED_USERNAMES = new Set([
  "api", "dashboard", "explore", "onboarding", "for", "sign-in", "sign-up",
  "signin", "signup", "admin", "help", "support", "about", "terms", "privacy",
  "blog", "login", "logout", "account", "settings", "profile", "user", "users",
  "giftbutler", "butler", "gift", "gifts", "not-found", "404", "500",
]);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { username, answers } = body;

  if (!username || username.length < 2) {
    return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
  }
  if (username.length > 30) {
    return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400 });
  }
  if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
    return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
  }

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return NextResponse.json({ error: "That username is reserved — try another" }, { status: 400 });
  }

  // Check username availability
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Username already taken — try another" }, { status: 400 });
  }

  // Create profile (admin client bypasses RLS)
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    username,
    name: null,
    avatar_url: null,
    bio: null,
  });

  if (profileError) {
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // Insert quiz answers as initial hints (validate and sanitize)
  if (answers && answers.length > 0) {
    const MAX_HINT_LENGTH = 280;
    const hints = answers
      .filter((content: unknown) => typeof content === "string" && content.trim().length > 0)
      .map((content: string) => ({
        user_id: userId,
        content: content.trim().slice(0, MAX_HINT_LENGTH),
        category: "general",
      }));
    if (hints.length > 0) await supabaseAdmin.from("hints").insert(hints);
  }

  // Send welcome email (fire and forget)
  if (process.env.RESEND_API_KEY) {
    (async () => {
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        if (!email) return;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
        const profileUrl = `${baseUrl}/for/${username}`;
        const dashboardUrl = `${baseUrl}/dashboard`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "GiftButler <hello@giftbutler.io>",
            to: [email],
            subject: "Your GiftButler profile is live 🎁",
            text: `Welcome to GiftButler!\n\nYour profile is live at: ${profileUrl}\n\nShare this link with the people who buy you gifts — they'll get AI-powered recommendations based on your hints.\n\nThe more hints you add, the better the recommendations. Head to your dashboard to add more: ${dashboardUrl}\n\n---\nGiftButler · Free forever\nTo stop these emails, reply with "unsubscribe" or email privacy@giftbutler.io`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
                <p style="font-size: 28px; margin: 0 0 4px;">🎁</p>
                <h1 style="font-size: 24px; font-weight: 800; color: #1c1917; margin: 0 0 8px;">Your profile is live!</h1>
                <p style="color: #78716c; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                  Welcome to GiftButler. Share your link with anyone who buys you gifts — they'll get AI-powered recommendations based on your hints.
                </p>

                <div style="background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
                  <p style="color: #a8a29e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">Your profile link</p>
                  <p style="color: #1c1917; font-size: 15px; font-weight: 600; margin: 0;">${profileUrl}</p>
                </div>

                <a href="${profileUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; margin: 0 0 24px;">
                  View my profile →
                </a>

                <div style="background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                  <p style="color: #1c1917; font-size: 15px; font-weight: 700; margin: 0 0 8px;">Tip: More hints = better gifts</p>
                  <p style="color: #78716c; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    Add hints about things you love, want, need, and dream about. The AI uses them to suggest gifts that feel personal — not generic.
                  </p>
                  <a href="${dashboardUrl}" style="display: inline-block; background: #1c1917; color: #fff; font-weight: 600; font-size: 13px; padding: 10px 20px; border-radius: 10px; text-decoration: none;">
                    Add more hints →
                  </a>
                </div>

                <p style="color: #a8a29e; font-size: 12px; margin: 0; line-height: 1.6;">
                  GiftButler · Free forever<br/>
                  To stop these emails, email <a href="mailto:privacy@giftbutler.io" style="color: #a8a29e;">privacy@giftbutler.io</a>
                </p>
              </div>
            `,
            headers: {
              "List-Unsubscribe": `<mailto:privacy@giftbutler.io?subject=Unsubscribe>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });
      } catch (err) { console.error("[welcome email] Failed:", err); }
    })();
  }

  return NextResponse.json({ success: true, username });
}
