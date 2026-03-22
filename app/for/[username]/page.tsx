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

  const { data: profile } = await supabaseAdmin
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

  // Determine viewer's relationship to this profile
  const { userId } = await auth();
  type ViewerRelationship = "owner" | "connections" | "pending" | "none";
  let viewerRelationship: ViewerRelationship = "none";

  if (userId === profile.id) {
    viewerRelationship = "owner";
  } else if (userId) {
    const { data: follow } = await supabaseAdmin
      .from("follows")
      .select("status")
      .or(`and(requester_id.eq.${userId},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${userId})`)
      .single();

    if (follow?.status === "accepted") viewerRelationship = "connections";
    else if (follow?.status === "pending") viewerRelationship = "pending";
  }

  // Privacy gate — locked profiles block all non-connections
  if (profile.is_private && viewerRelationship !== "owner" && viewerRelationship !== "connections") {
    const hintCountRes = await supabase
      .from("hints")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);
    const hintCount = hintCountRes.count ?? 0;
    const displayName = profile.name || profile.username;

    return (
      <LockedProfile
        displayName={displayName}
        username={profile.username}
        avatarUrl={avatarUrl}
        hintCount={hintCount}
        connectionStatus={userId ? (viewerRelationship === "pending" ? "pending" : "none") : "unauthenticated"}
      />
    );
  }

  const [hintsRes, claimsRes, occasionsRes] = await Promise.all([
    supabaseAdmin
      .from("hints")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("claims")
      .select("gift_description, occasion")
      .eq("recipient_user_id", profile.id),
    supabaseAdmin
      .from("occasions")
      .select("*")
      .eq("user_id", profile.id)
      .order("date", { ascending: true, nullsFirst: false }),
  ]);

  // Filter occasions by viewer's access level
  const canSeeConnections = viewerRelationship === "owner" || viewerRelationship === "connections";
  const allOccasions = occasionsRes.data || [];
  const visibleOccasions = viewerRelationship === "owner"
    ? allOccasions
    : allOccasions.filter(occ => {
        if (occ.visibility === "public") return true;
        if (occ.visibility === "connections") return canSeeConnections;
        return false; // private
      });

  // Filter hints by their list's visibility
  const hintsVisibility = profile.hints_visibility || "public";
  const canSeeHints = viewerRelationship === "owner"
    || hintsVisibility === "public"
    || (hintsVisibility === "connections" && canSeeConnections);
  const visibleOccasionIds = new Set(visibleOccasions.map(o => o.id));

  const allHints = hintsRes.data || [];
  const visibleHints = viewerRelationship === "owner"
    ? allHints
    : allHints.filter(hint => {
        const occId = hint.occasion_id ?? null;
        if (occId) return visibleOccasionIds.has(occId);
        return canSeeHints;
      });

  const claims = (claimsRes.data || []).map(c => ({
    description: c.gift_description.toLowerCase(),
    occasion: c.occasion ?? null,
  }));

  return (
    <ProfileClient
      username={username}
      initialProfile={profile}
      initialHints={visibleHints}
      initialClaims={claims}
      initialOccasions={visibleOccasions}
      avatarUrl={avatarUrl}
      viewerRelationship={viewerRelationship}
      birthday={profile.birthday ?? null}
    />
  );
}
