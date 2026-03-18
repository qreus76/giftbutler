import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, answers } = await req.json();

  if (!username || username.length < 2) {
    return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
  }

  // Check username availability
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Username already taken — try another" }, { status: 400 });
  }

  // Create profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    username,
    name: null,
    avatar_url: null,
    bio: null,
  });

  if (profileError) {
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // Insert quiz answers as initial hints
  if (answers && answers.length > 0) {
    const hints = answers.map((content: string) => ({
      user_id: userId,
      content,
      category: "general",
    }));
    await supabase.from("hints").insert(hints);
  }

  return NextResponse.json({ success: true, username });
}
