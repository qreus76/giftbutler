import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const RESERVED_USERNAMES = new Set([
  "api", "dashboard", "explore", "onboarding", "for", "sign-in", "sign-up",
  "signin", "signup", "admin", "help", "support", "about", "terms", "privacy",
  "blog", "login", "logout", "account", "settings", "profile", "user", "users",
  "giftbutler", "butler", "gift", "gifts", "not-found", "404", "500",
]);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { username, answers } = body;

  if (!username || username.length < 2) {
    return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
  }
  if (username.length > 30) {
    return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400 });
  }
  if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
    return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
  }

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return NextResponse.json({ error: "That username is reserved — try another" }, { status: 400 });
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

  // Create profile (admin client bypasses RLS)
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    username,
    name: null,
    avatar_url: null,
    bio: null,
  });

  if (profileError) {
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // Insert quiz answers as initial hints (validate and sanitize)
  if (answers && answers.length > 0) {
    const MAX_HINT_LENGTH = 280;
    const hints = answers
      .filter((content: unknown) => typeof content === "string" && content.trim().length > 0)
      .map((content: string) => ({
        user_id: userId,
        content: content.trim().slice(0, MAX_HINT_LENGTH),
        category: "general",
      }));
    if (hints.length > 0) await supabaseAdmin.from("hints").insert(hints);
  }

  return NextResponse.json({ success: true, username });
}
