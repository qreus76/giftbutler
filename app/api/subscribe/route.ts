import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Logged in Vercel function logs — connect your email service here
  // TODO: Replace with Resend, Mailchimp, ConvertKit, etc.
  // Example with Resend (add RESEND_API_KEY + RESEND_AUDIENCE_ID to env vars):
  // await fetch("https://api.resend.com/audiences/{id}/contacts", {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ email }),
  // });
  console.log(`[GiftButler Subscriber] ${new Date().toISOString()} - ${email}`);

  return NextResponse.json({ success: true });
}
