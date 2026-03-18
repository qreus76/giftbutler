import { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://giftbutler.io";

  // Static pages
  const static_pages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/explore`, changeFrequency: "hourly", priority: 0.8 },
  ];

  // All public profiles
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("username, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const profile_pages: MetadataRoute.Sitemap = (profiles || []).map(p => ({
    url: `${base}/for/${p.username}`,
    lastModified: new Date(p.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...static_pages, ...profile_pages];
}
