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

  const categoryLabels: Record<string, string> = {
    general: "Into lately",
    love: "Loves",
    like: "Likes",
    want: "Wants",
    need: "Needs",
    dream: "Dreams of",
    style: "Style & Preferences",
    avoid: "MUST AVOID",
  };

  // Separate product hints (specific wants) from text hints
  const productHints = (hints || []).filter(h => h.url);
  const textOnlyHints = (hints || []).filter(h => !h.url);

  // Build "already saved" exclusion list
  let specificWantsContext = "";
  if (productHints.length > 0) {
    const list = productHints.map(h => `  - ${h.product_title || h.content}`).join("\n");
    specificWantsContext = `\nALREADY SAVED AS SPECIFIC WANTS (DO NOT recommend these or anything substantially similar — the recipient already has them on their wishlist and wants the exact item, not an alternative):\n${list}\n`;
  }

  let hintsText = "No hints provided yet.";
  if (textOnlyHints.length > 0) {
    const grouped: Record<string, string[]> = {};
    for (const h of textOnlyHints) {
      if (!grouped[h.category]) grouped[h.category] = [];
      grouped[h.category].push(h.content);
    }
    // Put avoid last so it's prominent
    const order = ["style", "love", "want", "dream", "general", "like", "need", "avoid"];
    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    hintsText = sortedEntries
      .map(([cat, items]) => `[${categoryLabels[cat] || cat}]\n${items.map(i => `  - ${i}`).join("\n")}`)
      .join("\n\n");
  } else if (productHints.length > 0) {
    hintsText = "No text hints provided — use the specific wants and relationship context to guide suggestions.";
  }

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
      birthdayContext = `\nBIRTHDAY: ${daysUntil === 0 ? "Today!" : `In ${daysUntil} days`} — lean into birthday-appropriate gifts.`;
    }
  }

  const occasionContext = occasion
    ? `\nOCCASION: ${occasion.toUpperCase()} — tailor every recommendation to feel right for this specific occasion, not just generic gift ideas.`
    : "";

  const prompt = `You are GiftButler, an expert gift recommendation AI. Your goal is to find gifts so personal and specific that the recipient will feel truly seen and understood.

RECIPIENT: ${name}
RELATIONSHIP TO BUYER: ${relationship}
BUDGET: ${budget}${birthdayContext}${occasionContext}

THEIR HINTS:
${hintsText}
${specificWantsContext}

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
- Mix gift categories across the 8 — don't give 8 physical products
- Stay within budget — priceRange must fit within ${budget}
- Style & Preferences hints are GOLD — use them to make sure every recommendation matches their aesthetic, size, or taste
- CRITICAL: Anything under [MUST AVOID] is absolutely off-limits — do not recommend it, do not suggest anything adjacent to it
- category must be exactly one of: product, experience, subscription, consumable
- If no hints are provided, make thoughtful suggestions based on the relationship and what makes that relationship special`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    console.error("[recommend] Anthropic API error:", e);
    return NextResponse.json({ error: "AI service unavailable — please try again" }, { status: 503 });
  }

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }

  let recommendations;
  try {
    // Strip markdown code fences Claude occasionally adds
    const cleaned = content.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
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
