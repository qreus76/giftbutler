import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

// Secured with CRON_SECRET — called daily by Vercel cron
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + 7); // 7 days from now

  const targetMonth = targetDate.getMonth() + 1; // 1-12
  const targetDay = targetDate.getDate();

  // Find all profiles whose birthday falls on the target date (month + day match)
  // birthday is stored as YYYY-MM-DD, we match on MM-DD
  const targetMMDD = `${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

  const { data: birthdayProfiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name, birthday")
    .like("birthday", `%-${targetMMDD}`);

  if (error) {
    console.error("[birthday-reminders] Failed to fetch profiles:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!birthdayProfiles || birthdayProfiles.length === 0) {
    return NextResponse.json({ sent: 0, message: "No birthdays in 7 days" });
  }

  const clerk = await clerkClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
  let sent = 0;

  for (const birthdayPerson of birthdayProfiles) {
    // Find all accepted followers of this person
    const { data: followers } = await supabaseAdmin
      .from("follows")
      .select("requester_id, requester_label, receiver_id, receiver_label")
      .eq("status", "accepted")
      .or(`requester_id.eq.${birthdayPerson.id},receiver_id.eq.${birthdayPerson.id}`);

    if (!followers || followers.length === 0) continue;

    const displayName = birthdayPerson.name || birthdayPerson.username;
    const profileUrl = `${baseUrl}/for/${birthdayPerson.username}`;

    for (const follow of followers) {
      // The follower is the OTHER person (not the birthday person)
      const followerId = follow.requester_id === birthdayPerson.id ? follow.receiver_id : follow.requester_id;
      const myLabel = follow.requester_id === followerId ? follow.requester_label : follow.receiver_label;

      // Don't remind the birthday person about their own birthday
      if (followerId === birthdayPerson.id) continue;

      try {
        const followerUser = await clerk.users.getUser(followerId);
        const followerEmail = followerUser.emailAddresses[0]?.emailAddress;
        if (!followerEmail) continue;

        const labelText = myLabel ? `your ${myLabel}` : "someone in your people";
        const subject = `🎂 ${displayName}'s birthday is in 7 days`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "GiftButler <notifications@giftbutler.io>",
            to: [followerEmail],
            subject,
            text: `${displayName}'s birthday is in 7 days. Don't leave it too late — find the perfect gift at: ${profileUrl}\n\n---\nGiftButler · To stop these notifications, email privacy@giftbutler.io`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
                <div style="background: #fbbf24; border-radius: 16px; padding: 20px 24px; margin: 0 0 24px; text-align: center;">
                  <p style="font-size: 40px; margin: 0 0 8px;">🎂</p>
                  <h1 style="font-size: 22px; font-weight: 800; color: #1c1917; margin: 0;">${displayName}'s birthday is in 7 days</h1>
                </div>
                <p style="color: #78716c; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                  Don't leave it too late — ${displayName} is ${labelText} and their birthday is coming up fast.
                  They've already dropped hints about what they want.
                </p>
                <a href="${profileUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
                  Find the perfect gift →
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
        sent++;
      } catch (err) {
        console.error(`[birthday-reminders] Failed to send for ${birthdayPerson.username}:`, err);
      }
    }
  }

  return NextResponse.json({ sent, birthdaysFound: birthdayProfiles.length });
}
