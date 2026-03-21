import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import ProfileClient from "./ProfileClient";
import LockedProfile from "./LockedProfile";

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

  const ogImage = `/for/${username}/opengraph-image`;

  return {
    title: `Gift ideas for ${name} — GiftButler`,
    description,
    openGraph: {
      title: `What to get ${name} — GiftButler`,
      description,
      siteName: "GiftButler",
      type: "profile",
      url: `/for/${username}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Gift ideas for ${name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `What to get ${name}`,
      description,
      images: [ogImage],
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

  if (!profile) {
    // Check if this was a previously valid username — redirect to the new one
    const { data: history } = await supabaseAdmin
      .from("username_history")
      .select("user_id")
      .eq("old_username", username)
      .order("changed_at", { ascending: false })
      .limit(1)
      .single();

    if (history) {
      const { data: current } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", history.user_id)
        .single();
      if (current?.username) redirect(`/for/${current.username}`);
    }

    notFound();
  }

  // Get Clerk profile photo if available
  let avatarUrl: string | null = null;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(profile.id);
    avatarUrl = clerkUser.hasImage ? clerkUser.imageUrl : null;
  } catch { /* no photo available */ }

  // Privacy gate
  if (profile.is_private) {
    const { userId } = await auth();

    // Owner always sees their own profile
    if (userId !== profile.id) {
      const hintCountRes = await supabase
        .from("hints")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id);
      const hintCount = hintCountRes.count ?? 0;
      const displayName = profile.name || profile.username;

      // Check connection status
      let connectionStatus: "unauthenticated" | "none" | "pending" = "unauthenticated";
      if (userId) {
        const { data: follow } = await supabaseAdmin
          .from("follows")
          .select("status")
          .or(`and(requester_id.eq.${userId},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${userId})`)
          .single();

        if (follow?.status === "accepted") {
          // Accepted connection — fall through to show full profile
          connectionStatus = "accepted" as never;
        } else if (follow?.status === "pending") {
          connectionStatus = "pending";
        } else {
          connectionStatus = "none";
        }
      }

      if (connectionStatus !== ("accepted" as never)) {
        return (
          <LockedProfile
            displayName={displayName}
            username={profile.username}
            avatarUrl={avatarUrl}
            hintCount={hintCount}
            connectionStatus={connectionStatus}
          />
        );
      }
    }
  }

  const [hintsRes, claimsRes, occasionsRes] = await Promise.all([
    supabase
      .from("hints")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("claims")
      .select("gift_description, occasion")
      .eq("recipient_user_id", profile.id),
    supabase
      .from("occasions")
      .select("*")
      .eq("user_id", profile.id)
      .order("date", { ascending: true, nullsFirst: false }),
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
      initialOccasions={occasionsRes.data || []}
      avatarUrl={avatarUrl}
    />
  );
}
