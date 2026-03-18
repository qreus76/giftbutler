import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import ProfileClient from "./ProfileClient";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, bio, id")
    .eq("username", username)
    .single();

  if (!profile) return { title: "Profile not found — GiftButler" };

  const name = profile.name || username;
  const description = profile.bio
    ? `${name} has shared hints about what they love. Find the perfect gift — personalized by AI.`
    : `Find the perfect gift for ${name}. They've left hints about their interests and wishes.`;

  let avatarUrl: string | undefined;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(profile.id);
    if (clerkUser.imageUrl) avatarUrl = clerkUser.imageUrl;
  } catch { /* no avatar */ }

  return {
    title: `Gift ideas for ${name} — GiftButler`,
    description,
    openGraph: {
      title: `What to get ${name} — GiftButler`,
      description,
      siteName: "GiftButler",
      type: "profile",
      ...(avatarUrl ? { images: [{ url: avatarUrl, width: 400, height: 400, alt: name }] } : {}),
    },
    twitter: {
      card: avatarUrl ? "summary" : "summary",
      title: `What to get ${name}`,
      description,
      ...(avatarUrl ? { images: [avatarUrl] } : {}),
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  // Get Clerk profile photo if available
  let avatarUrl: string | null = null;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(profile.id);
    avatarUrl = clerkUser.imageUrl || null;
  } catch { /* no photo available */ }

  const [hintsRes, claimsRes] = await Promise.all([
    supabase
      .from("hints")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("claims")
      .select("gift_description, occasion")
      .eq("recipient_user_id", profile.id),
  ]);

  const claims = (claimsRes.data || []).map(c => ({
    description: c.gift_description.toLowerCase(),
    occasion: c.occasion ?? null,
  }));

  return (
    <ProfileClient
      username={username}
      initialProfile={profile}
      initialHints={hintsRes.data || []}
      initialClaims={claims}
      avatarUrl={avatarUrl}
    />
  );
}
