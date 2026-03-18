import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function OgImage({ params }: Props) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, bio")
    .eq("username", username)
    .single();

  const name = profile?.name || username;
  const bio = profile?.bio || null;
  const initial = name[0]?.toUpperCase() || "?";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "80px",
        }}
      >
        {/* Amber accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            backgroundColor: "#fbbf24",
          }}
        />

        {/* Avatar circle */}
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "9999px",
            backgroundColor: "#fbbf24",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "56px",
            fontWeight: "800",
            color: "#1c1917",
            marginBottom: "32px",
          }}
        >
          {initial}
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: "800",
            color: "#1c1917",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          {name}
        </div>

        {/* Username */}
        <div
          style={{
            fontSize: "24px",
            color: "#a8a29e",
            marginBottom: bio ? "24px" : "0",
          }}
        >
          @{username}
        </div>

        {/* Bio */}
        {bio && (
          <div
            style={{
              fontSize: "24px",
              color: "#57534e",
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.5,
            }}
          >
            {bio.length > 100 ? bio.slice(0, 100) + "…" : bio}
          </div>
        )}

        {/* Bottom tag */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            display: "flex",
            alignItems: "center",
            backgroundColor: "#fef3c7",
            borderRadius: "9999px",
            padding: "10px 28px",
          }}
        >
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#92400e" }}>
            Find the perfect gift · GiftButler
          </span>
        </div>
      </div>
    ),
    size,
  );
}
