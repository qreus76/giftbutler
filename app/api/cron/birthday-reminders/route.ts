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

  function mmdd(daysFromNow: number): string {
    const d = new Date(today);
    d.setDate(today.getDate() + daysFromNow);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Fetch profiles for all relevant milestones at once
  const milestoneDays = [3, 7, 14];
  const mmddValues = milestoneDays.map(d => mmdd(d));

  const { data: allBirthdayProfiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, name, birthday")
    .or(mmddValues.map(v => `birthday.like.%-${v}`).join(","));

  // Separate profiles by which milestone they hit today
  const profilesByMilestone: Record<number, typeof allBirthdayProfiles> = {};
  for (const days of milestoneDays) {
    const target = mmdd(days);
    profilesByMilestone[days] = (allBirthdayProfiles || []).filter(p =>
      p.birthday?.endsWith(`-${target}`) || p.birthday?.slice(5) === target
    );
  }

  const birthdayProfiles = profilesByMilestone[7] || [];
  const error7 = error;

  if (error7) {
    console.error("[birthday-reminders] Failed to fetch profiles:", error7.message);
    return NextResponse.json({ error: error7.message }, { status: 500 });
  }

  const clerk = await clerkClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io";
  let sent = 0;

  for (const birthdayPerson of birthdayProfiles) {
    // Find everyone who has this person in their list:
    // - accepted connections (both directions)
    // - pending where birthday person is the receiver (requester added them, should still get reminded)
    const { data: followers } = await supabaseAdmin
      .from("follows")
      .select("requester_id, requester_label, receiver_id, receiver_label, status")
      .or(`and(status.eq.accepted,or(requester_id.eq.${birthdayPerson.id},receiver_id.eq.${birthdayPerson.id})),and(status.eq.pending,receiver_id.eq.${birthdayPerson.id})`);

    if (!followers || followers.length === 0) continue;

    const displayName = birthdayPerson.name || birthdayPerson.username;
    const profileUrl = `${baseUrl}/for/${birthdayPerson.username}`;

    for (const follow of followers) {
      // For accepted: notify the other person. For pending: notify the requester.
      const followerId = follow.status === "pending"
        ? follow.requester_id
        : (follow.requester_id === birthdayPerson.id ? follow.receiver_id : follow.requester_id);
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

  // Send reminders to the profile owner at 14 days and 3 days before their birthday
  for (const [days, label, subject] of [
    [14, "2 weeks", "Your birthday is 2 weeks away — is your list ready?"],
    [3,  "3 days",  "3 days until your birthday — time to share your list!"],
  ] as [number, string, string][]) {
    const ownerProfiles = profilesByMilestone[days] || [];
    for (const profile of ownerProfiles) {
      try {
        const clerkUser = await clerk.users.getUser(profile.id);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        if (!email) continue;

        const name = profile.name || profile.username;
        const profileUrl = `${baseUrl}/for/${profile.username}`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "GiftButler <hello@giftbutler.io>",
            to: [email],
            subject,
            text: `Hey ${name}! Your birthday is in ${label}.\n\nNow's the perfect time to share your GiftButler profile so the people who buy you gifts know exactly what you want.\n\nYour profile: ${profileUrl}\n\n---\nGiftButler · Free forever\nTo stop these emails, email privacy@giftbutler.io`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9;">
                <div style="background: #fbbf24; border-radius: 16px; padding: 20px 24px; margin: 0 0 24px; text-align: center;">
                  <h1 style="font-size: 22px; font-weight: 800; color: #1c1917; margin: 0 0 4px;">Your birthday is in ${label}</h1>
                  <p style="color: #1c1917; font-size: 14px; margin: 0; opacity: 0.7;">Time to share your list, ${name}</p>
                </div>
                <p style="color: #78716c; font-size: 15px; margin: 0 0 16px; line-height: 1.6;">
                  The people who want to get you something don&apos;t have to guess — share your GiftButler profile and they&apos;ll know exactly what to get you.
                </p>
                <div style="background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
                  <p style="color: #a8a29e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">Your profile link</p>
                  <p style="color: #1c1917; font-size: 14px; font-weight: 600; margin: 0;">${profileUrl}</p>
                </div>
                <a href="${profileUrl}" style="display: inline-block; background: #fbbf24; color: #1c1917; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; margin: 0 0 24px;">
                  View &amp; share my profile →
                </a>
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
        console.error(`[birthday-reminders] Owner reminder failed for ${profile.username}:`, err);
      }
    }
  }

  return NextResponse.json({ sent, birthdaysFound: birthdayProfiles.length });
}
