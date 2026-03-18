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
    .select("name, bio")
    .eq("username", username)
    .single();

  if (!profile) return { title: "Profile not found — GiftButler" };

  const name = profile.name || username;
  const description = profile.bio
    ? `${name} has shared hints about what they love. Find the perfect gift — personalized by AI.`
    : `Find the perfect gift for ${name}. They've left hints about their interests and wishes.`;

  return {
    title: `Gift ideas for ${name} — GiftButler`,
    description,
    openGraph: {
      title: `What to get ${name} — GiftButler`,
      description,
      siteName: "GiftButler",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `What to get ${name}`,
      description,
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
      .select("gift_description")
      .eq("recipient_user_id", profile.id),
  ]);

  const claims = (claimsRes.data || []).map(c => c.gift_description.toLowerCase());

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
