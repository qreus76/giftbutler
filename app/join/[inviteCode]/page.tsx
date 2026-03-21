import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import JoinClient from "./JoinClient";

interface Props {
  params: Promise<{ inviteCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { inviteCode } = await params;

  const { data: circle } = await supabaseAdmin
    .from("gift_circles")
    .select("name, budget, circle_type, organizer_id")
    .eq("invite_code", inviteCode)
    .single();

  if (!circle) {
    return { title: "Invite not found — GiftButler" };
  }

  const { data: organizer } = await supabaseAdmin
    .from("profiles")
    .select("name, username")
    .eq("id", circle.organizer_id)
    .single();

  const organizerName = organizer?.name || organizer?.username || "Someone";
  const isExchange = circle.circle_type !== "occasion";
  const budgetText = circle.budget ? ` · $${circle.budget} ${isExchange ? "per person" : "contribution"}` : "";
  const typeText = isExchange ? "Gift Exchange" : "Group Occasion";
  const title = `${circle.name} — GiftButler`;
  const description = `${organizerName} invited you to join "${circle.name}" — a ${typeText} on GiftButler${budgetText}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "GiftButler",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GiftButler" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function JoinPage({ params }: Props) {
  const { inviteCode } = await params;
  return <JoinClient inviteCode={inviteCode} />;
}
