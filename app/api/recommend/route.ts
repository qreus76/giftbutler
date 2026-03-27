import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
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
  const { username, relationship, budget, occasion, is_self_discovery } = body;
  if (!username || !budget) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!is_self_discovery && !relationship) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Self-discovery: must be authenticated as the profile owner
  if (is_self_discovery) {
    const { userId } = await auth();
    const { data: ownerCheck } = await supabase.from("profiles").select("id").eq("username", username).single();
    if (!userId || !ownerCheck || userId !== ownerCheck.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Get profile and hints
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Self-discovery uses admin client to fetch ALL hints (owner sees everything)
  const hintsClient = is_self_discovery ? supabaseAdmin : supabase;
  const { data: hints } = await hintsClient
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
  const effectiveRelationship = is_self_discovery ? "yourself (self-gift — the buyer and recipient are the same person)" : relationship;

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

  void occasionText;

  const prompt = `You are GiftButler, an expert gift recommendation AI. Your goal is to find gifts so personal and specific that the recipient will feel truly seen and understood.
${is_self_discovery ? `\nThis is a SELF-DISCOVERY session — ${name} is finding gifts for themselves. Every suggestion should be something they'd genuinely use and love, not a generic gift idea.\n` : ""}
RECIPIENT: ${name}
RELATIONSHIP TO BUYER: ${effectiveRelationship}
BUDGET: ${budget}${birthdayContext}${occasionContext}

THEIR HINTS:
${hintsText}
${specificWantsContext}
Generate exactly 8 specific, emotionally resonant gift recommendations. Each gift must feel personally connected to this specific person — not generic suggestions that could work for anyone.

Respond with EXACTLY 8 JSON objects, one per line (newline-delimited JSON). No array brackets, no markdown fences, no extra text. Each line must be a complete, standalone JSON object in this exact format:
{"title":"Specific product or experience name","why":"Two sentences: the first connects directly to their hints, the second explains the emotional significance.","priceRange":"$XX – $XX","category":"product","searchQuery":"precise Amazon search terms"}

Rules:
- Be HYPER-SPECIFIC (not "golf club" but "Callaway Rogue ST Max Driver", not "book" but the actual title and author)
- Every recommendation must trace back to a specific hint they shared
- The "why" must feel warm and personal — like it came from someone who truly knows them
- Mix gift categories across the 8 — don't give 8 physical products
- Stay within budget — priceRange must fit within ${budget}
- Style & Preferences hints are GOLD — use them to make sure every recommendation matches their aesthetic, size, or taste
- CRITICAL: Anything under [MUST AVOID] is absolutely off-limits — do not recommend it, do not suggest anything adjacent to it
- category must be exactly one of: product, experience, subscription, consumable
- If no hints are provided, make thoughtful suggestions based on the relationship and what makes that relationship special
- Output each JSON object on its own line with no trailing comma`;

  const AFFILIATE_TAG_VAL = AFFILIATE_TAG;
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const text of stream.textStream) {
          buffer += text;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("{")) continue;
            let parsed: { title?: string; why?: string; priceRange?: string; category?: string; searchQuery?: string };
            try { parsed = JSON.parse(t); } catch { continue; }
            if (!parsed.title || !parsed.searchQuery) continue;
            const rec = {
              title: parsed.title,
              why: parsed.why ?? "",
              priceRange: parsed.priceRange ?? "",
              category: parsed.category ?? "product",
              searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(parsed.searchQuery)}&tag=${AFFILIATE_TAG_VAL}`,
            };
            controller.enqueue(encoder.encode(JSON.stringify(rec) + "\n"));
          }
        }

        // Flush any remaining buffered line
        const t = buffer.trim();
        if (t.startsWith("{")) {
          let parsed: { title?: string; why?: string; priceRange?: string; category?: string; searchQuery?: string };
          try {
            parsed = JSON.parse(t);
            if (parsed.title && parsed.searchQuery) {
              const rec = {
                title: parsed.title,
                why: parsed.why ?? "",
                priceRange: parsed.priceRange ?? "",
                category: parsed.category ?? "product",
                searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(parsed.searchQuery)}&tag=${AFFILIATE_TAG_VAL}`,
              };
              controller.enqueue(encoder.encode(JSON.stringify(rec) + "\n"));
            }
          } catch { /* skip */ }
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

      } catch (e) {
        console.error("[recommend] Stream error:", e);
        controller.enqueue(encoder.encode(JSON.stringify({ error: "AI service unavailable — please try again" }) + "\n"));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
