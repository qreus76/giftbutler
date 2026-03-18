import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: hints } = await supabase
    .from("hints")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  // Record visit (fire and forget)
  const visitorSession = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
  supabaseAdmin.from("profile_visits").insert({
    profile_user_id: profile.id,
    visitor_session: visitorSession,
  }).then(async () => {
    // Send email notification (at most once per hour per profile)
    if (!process.env.RESEND_API_KEY) return;
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { count } = await supabaseAdmin
        .from("profile_visits")
        .select("*", { count: "exact", head: true })
        .eq("profile_user_id", profile.id)
        .gte("created_at", oneHourAgo.toISOString());

      // Only notify on the first visit in each hour window
      if (count && count > 1) return;

      const clerk = await clerkClient();
      const user = await clerk.users.getUser(profile.id);
      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) return;

      const displayName = profile.name || username;
      const profileUrl = `https://giftbutler.io/for/${username}`;
      const dashboardUrl = `https://giftbutler.io/dashboard`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "GiftButler <notifications@giftbutler.io>",
          to: [email],
          subject: `👀 Someone just visited your gift profile`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
              <h1 style="font-size: 24px; font-weight: 800; color: #1c1917; margin: 0 0 8px;">Someone just looked at your profile 👀</h1>
              <p style="color: #78716c; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                A visitor just checked out <a href="${profileUrl}" style="color: #d97706; text-decoration: none;">giftbutler.io/for/${username}</a>.
                Make sure your hints are up to date so they find the perfect gift for you, ${displayName}.
              </p>
              <a href="${dashboardUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
                Update my hints →
              </a>
              <p style="color: #a8a29e; font-size: 12px; margin: 32px 0 0;">
                GiftButler · Free forever · <a href="${dashboardUrl}" style="color: #a8a29e;">Manage my profile</a>
              </p>
            </div>
          `,
        }),
      });
    } catch { /* silent fail */ }
  });

  return NextResponse.json({ profile, hints: hints || [] });
}
