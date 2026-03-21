import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

const RESERVED_USERNAMES = new Set([
  "api", "dashboard", "activity", "explore", "onboarding", "for", "sign-in", "sign-up",
  "signin", "signup", "admin", "help", "support", "about", "terms", "privacy",
  "blog", "login", "logout", "account", "settings", "profile", "user", "users",
  "giftbutler", "butler", "gift", "gifts", "not-found", "404", "500",
]);

const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { name, bio, birthday, username } = body;

  if (name && name.trim().length > 60) {
    return NextResponse.json({ error: "Name must be 60 characters or less" }, { status: 400 });
  }
  if (bio && bio.trim().length > 160) {
    return NextResponse.json({ error: "Bio must be 160 characters or less" }, { status: 400 });
  }

  if (birthday?.trim()) {
    const parsed = new Date(birthday.trim());
    if (isNaN(parsed.getTime()) || parsed > new Date()) {
      return NextResponse.json({ error: "Birthday must be a valid past date" }, { status: 400 });
    }
  }

  const updates: Record<string, string | null> = {
    name: name || null,
    bio: bio || null,
    birthday: birthday?.trim() || null,
  };

  // Handle username change
  if (username) {
    const clean = username.trim().toLowerCase();

    if (clean.length < 2) {
      return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 });
    }
    if (RESERVED_USERNAMES.has(clean)) {
      return NextResponse.json({ error: "That username is reserved — try another" }, { status: 400 });
    }

    // Fetch current profile to check cooldown and get old username
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("username, username_changed_at")
      .eq("id", userId)
      .single();

    if (currentProfile && clean !== currentProfile.username) {
      // Enforce cooldown
      if (currentProfile.username_changed_at) {
        const changedAt = new Date(currentProfile.username_changed_at);
        const cooldownMs = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        const nextAllowed = new Date(changedAt.getTime() + cooldownMs);
        if (new Date() < nextAllowed) {
          const dateStr = nextAllowed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          return NextResponse.json(
            { error: `You can change your username again on ${dateStr}` },
            { status: 429 }
          );
        }
      }

      // Check availability (exclude current user)
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", clean)
        .neq("id", userId)
        .single();

      if (existing) {
        return NextResponse.json({ error: "Username already taken — try another" }, { status: 400 });
      }

      // Log old username to history
      await supabaseAdmin
        .from("username_history")
        .insert({ user_id: userId, old_username: currentProfile.username });

      updates.username = clean;
      updates.username_changed_at = new Date().toISOString();
    }
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, username: updates.username });
}
