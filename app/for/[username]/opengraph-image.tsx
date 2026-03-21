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
  const bio = profile?.bio ? (profile.bio.length > 100 ? profile.bio.slice(0, 100) + "…" : profile.bio) : null;
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
          backgroundColor: "#EAEAE0",
        }}
      >
        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "32px",
            padding: "56px 80px",
            maxWidth: "900px",
            width: "100%",
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: "112px",
              height: "112px",
              borderRadius: "9999px",
              backgroundColor: "#ECC8AE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "52px",
              fontWeight: 800,
              color: "#5C3118",
              marginBottom: "24px",
            }}
          >
            {initial}
          </div>

          {/* Name */}
          <div
            style={{
              fontSize: "60px",
              fontWeight: 800,
              color: "#111111",
              marginBottom: "8px",
              display: "flex",
            }}
          >
            {name}
          </div>

          {/* Username */}
          <div
            style={{
              fontSize: "24px",
              color: "#888888",
              marginBottom: bio ? "20px" : "0",
              display: "flex",
            }}
          >
            @{username}
          </div>

          {/* Bio */}
          {bio && (
            <div
              style={{
                fontSize: "22px",
                color: "#555555",
                textAlign: "center",
                maxWidth: "700px",
                display: "flex",
                marginTop: "4px",
              }}
            >
              {bio}
            </div>
          )}
        </div>

        {/* Bottom tag */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            display: "flex",
            alignItems: "center",
            backgroundColor: "#ECC8AE",
            borderRadius: "9999px",
            padding: "10px 28px",
          }}
        >
          <span style={{ fontSize: "20px", fontWeight: 700, color: "#5C3118" }}>
            Find the perfect gift · GiftButler
          </span>
        </div>
      </div>
    ),
    size,
  );
}
