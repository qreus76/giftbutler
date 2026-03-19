import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_HINT_LENGTH = 280;
const VALID_CATEGORIES = ["general", "love", "like", "want", "need", "dream", "avoid"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { content, category } = body;
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.trim().length > MAX_HINT_LENGTH) {
    return NextResponse.json({ error: `Hints must be ${MAX_HINT_LENGTH} characters or less` }, { status: 400 });
  }

  const safeCategory = VALID_CATEGORIES.includes(category) ? category : "general";

  const { data, error } = await supabaseAdmin
    .from("hints")
    .update({ content: content.trim(), category: safeCategory })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("hints")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
