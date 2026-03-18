import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: hints } = await supabase
    .from("hints")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ profile, hints: hints || [] });
}
