import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || "giftbutler09-20";

// Simple in-memory rate limiter: 10 requests per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — try again later" }, { status: 429 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { username, relationship, budget, occasion } = body;
  if (!username || !relationship || !budget) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get profile and hints
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: hints } = await supabase
    .from("hints")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const hintsText = hints && hints.length > 0
    ? hints.map((h) => `- [${h.category}] ${h.content}`).join("\n")
    : "No hints provided yet.";

  const name = profile.name || username;
  const occasionText = occasion ? ` for their ${occasion}` : "";

  let birthdayContext = "";
  if (profile.birthday) {
    const parts = profile.birthday.split("-");
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const today = new Date();
    let next = new Date(today.getFullYear(), month, day);
    if (next <= today) next = new Date(today.getFullYear() + 1, month, day);
    const daysUntil = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 60) {
      birthdayContext = `\nBIRTHDAY: ${daysUntil === 0 ? "Today!" : `In ${daysUntil} days`} — factor urgency/relevance into recommendations.`;
    }
  }

  const prompt = `You are GiftButler, an expert gift recommendation AI. You need to find the perfect gift${occasionText}.

RECIPIENT: ${name}
RELATIONSHIP TO BUYER: ${relationship}
BUDGET: ${budget}${birthdayContext}

THEIR HINTS (things they've shared about their life, interests, and wishes):
${hintsText}

Generate exactly 5 specific, thoughtful gift recommendations based on their hints. Each gift should feel personal and directly connected to something they mentioned.

Respond with ONLY a JSON array in this exact format:
[
  {
    "title": "Specific product name",
    "why": "One sentence explaining exactly why this connects to their hints and would mean something to them personally.",
    "priceRange": "$XX – $XX",
    "searchQuery": "search terms to find this on Amazon"
  }
]

Rules:
- Be SPECIFIC (not "a book" but "The Wim Hof Method book")
- Connect each gift DIRECTLY to one of their hints
- Stay within the budget
- Avoid anything in their "avoid" hints
- If no hints are provided, make reasonable suggestions based on their relationship`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }

  let recommendations;
  try {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    recommendations = parsed.map((r: { title: string; why: string; priceRange: string; searchQuery: string }) => ({
      title: r.title,
      why: r.why,
      priceRange: r.priceRange,
      searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(r.searchQuery)}&tag=${AFFILIATE_TAG}`,
    }));
  } catch {
    return NextResponse.json({ error: "Failed to parse recommendations" }, { status: 500 });
  }

  return NextResponse.json({ recommendations });
}
