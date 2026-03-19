import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase, supabaseAdmin } from "@/lib/supabase";

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

  const prompt = `You are GiftButler, an expert gift recommendation AI. Your goal is to find gifts so personal and specific that the recipient will feel truly seen and understood.

RECIPIENT: ${name}
RELATIONSHIP TO BUYER: ${relationship}
BUDGET: ${budget}${birthdayContext}

THEIR HINTS (things they've shared about their life, interests, and wishes):
${hintsText}

Generate exactly 8 specific, emotionally resonant gift recommendations. Each gift must feel personally connected to this specific person — not generic suggestions that could work for anyone.

Respond with ONLY a JSON array in this exact format:
[
  {
    "title": "Specific product or experience name",
    "why": "Two sentences: the first connects directly to their hints, the second explains the emotional significance — why this will make them feel seen and understood.",
    "priceRange": "$XX – $XX",
    "category": "product|experience|subscription|consumable",
    "searchQuery": "precise Amazon search terms to find this exact item"
  }
]

Rules:
- Be HYPER-SPECIFIC (not "golf club" but "Callaway Rogue ST Max Driver", not "book" but the actual title and author)
- Every recommendation must trace back to a specific hint they shared
- The "why" must feel warm and personal — like it came from someone who truly knows them
- Mix categories across the 8 — don't give 8 physical products
- Stay within budget — priceRange must fit within ${budget}
- CRITICAL: Avoid anything in their "avoid" hints — this is non-negotiable
- category must be exactly one of: product, experience, subscription, consumable
- If no hints are provided, make thoughtful suggestions based on the relationship and what makes that relationship special`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
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
    recommendations = parsed.map((r: { title: string; why: string; priceRange: string; searchQuery: string; category: string }) => ({
      title: r.title,
      why: r.why,
      priceRange: r.priceRange,
      category: r.category || "product",
      searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(r.searchQuery)}&tag=${AFFILIATE_TAG}`,
    }));
  } catch {
    return NextResponse.json({ error: "Failed to parse recommendations" }, { status: 500 });
  }

  // Log this recommendation request (fire and forget)
  supabaseAdmin.from("recommend_logs").insert({
    profile_username: username,
    relationship,
    budget,
    occasion: occasion || null,
  }).then(({ error }) => {
    if (error) console.error("[recommend_logs] Failed to log:", error.message);
  });

  return NextResponse.json({ recommendations });
}
