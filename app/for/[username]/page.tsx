import type { Metadata } from "next";
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

  const name = profile?.name || username;
  const description = profile?.bio
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

export default function ProfilePage() {
  return <ProfileClient />;
}
