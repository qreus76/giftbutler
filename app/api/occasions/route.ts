import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const username = new URL(req.url).searchParams.get("username");
  if (!username) return NextResponse.json({ occasions: [] });

  const { data: profile } = await supabase
    .from("profiles").select("id").eq("username", username).single();
  if (!profile) return NextResponse.json({ occasions: [] });

  const { data: occasions } = await supabase
    .from("occasions").select("*").eq("user_id", profile.id)
    .order("date", { ascending: true, nullsFirst: false });

  return NextResponse.json({ occasions: occasions || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { name, date } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (name.trim().length > 100) return NextResponse.json({ error: "Name too long" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("occasions")
    .insert({ user_id: userId, name: name.trim(), date: date || null })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
