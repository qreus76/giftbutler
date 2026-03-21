import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";

  // Views in the last 7 days, grouped by profile_id
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: visitRows, error } = await supabaseAdmin
    .from("profile_visits")
    .select("profile_id")
    .gte("created_at", since);

  if (error) {
    console.error("[weekly-digest] Failed to fetch visits:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!visitRows || visitRows.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Count visits per profile
  const countMap = new Map<string, number>();
  for (const row of visitRows) {
    countMap.set(row.profile_id, (countMap.get(row.profile_id) || 0) + 1);
  }

  // Get profile info for these users
  const profileIds = Array.from(countMap.keys());
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name")
    .in("id", profileIds);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Get hint counts per user
  const { data: hintRows } = await supabaseAdmin
    .from("hints")
    .select("user_id")
    .in("user_id", profileIds);

  const hintCountMap = new Map<string, number>();
  for (const row of hintRows || []) {
    hintCountMap.set(row.user_id, (hintCountMap.get(row.user_id) || 0) + 1);
  }

  const clerk = await clerkClient();
  let sent = 0;

  for (const profile of profiles) {
    const views = countMap.get(profile.id) || 0;
    if (views === 0) continue;

    try {
      const clerkUser = await clerk.users.getUser(profile.id);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) continue;

      const name = profile.name || profile.username;
      const profileUrl = `${baseUrl}/for/${profile.username}`;
      const dashboardUrl = `${baseUrl}/home`;
      const hintCount = hintCountMap.get(profile.id) || 0;
      const lowHints = hintCount < 5;

      const viewText = views === 1 ? "1 person visited your profile" : `${views} people visited your profile`;
      const tipHtml = lowHints
        ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
            <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 6px;">Tip: Add more hints</p>
            <p style="color: #92400e; font-size: 13px; line-height: 1.6; margin: 0 0 12px;">
              You have ${hintCount} hint${hintCount === 1 ? "" : "s"}. The more you add, the more personal the gift recommendations. Try adding things you want, need, or dream about.
            </p>
            <a href="${profileUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 600; font-size: 13px; padding: 8px 16px; border-radius: 8px; text-decoration: none;">Add hints →</a>
          </div>`
        : "";

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "GiftButler <hello@giftbutler.io>",
          to: [email],
          subject: `${viewText} this week`,
          text: `${viewText} this week on GiftButler.\n\nView your profile: ${profileUrl}\nAdd hints: ${profileUrl}\n\n---\nGiftButler · Free forever\nTo stop these emails, email privacy@giftbutler.io`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
              <h1 style="font-size: 22px; font-weight: 800; color: #1c1917; margin: 0 0 8px;">Your weekly update, ${name}</h1>

              <div style="background: #fff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 24px; margin: 0 0 20px; text-align: center;">
                <p style="font-size: 40px; font-weight: 900; color: #fbbf24; margin: 0 0 4px; line-height: 1;">${views}</p>
                <p style="color: #78716c; font-size: 15px; margin: 0;">
                  ${views === 1 ? "person visited your profile" : "people visited your profile"} this week
                </p>
              </div>

              ${tipHtml}

              <div style="display: flex; gap: 12px; margin: 0 0 24px;">
                <a href="${profileUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 20px; border-radius: 12px; text-decoration: none;">
                  View my profile →
                </a>
                <a href="${dashboardUrl}" style="display: inline-block; background: #1c1917; color: #fff; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px; text-decoration: none;">
                  Activity
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

      sent++;
    } catch (err) {
      console.error(`[weekly-digest] Failed for ${profile.username}:`, err);
    }
  }

  return NextResponse.json({ sent });
}
