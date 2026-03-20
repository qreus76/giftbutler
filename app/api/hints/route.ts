import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_HINT_LENGTH = 280;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { content, category, url, product_title, product_image, product_price } = body;
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  if (content.trim().length > MAX_HINT_LENGTH) {
    return NextResponse.json({ error: `Hints must be ${MAX_HINT_LENGTH} characters or less` }, { status: 400 });
  }

  const VALID_CATEGORIES = ["general", "love", "like", "want", "need", "dream", "style", "avoid"];
  const safeCategory = VALID_CATEGORIES.includes(category) ? category : "general";

  const { data, error } = await supabaseAdmin
    .from("hints")
    .insert({
      user_id: userId,
      content: content.trim(),
      category: safeCategory,
      url: url || null,
      product_title: product_title || null,
      product_image: product_image || null,
      product_price: product_price || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
