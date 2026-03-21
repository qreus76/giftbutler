import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
            padding: "64px 80px",
            maxWidth: "900px",
            width: "100%",
          }}
        >
          {/* Logo pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#ECC8AE",
              borderRadius: "9999px",
              padding: "10px 28px",
              marginBottom: "36px",
            }}
          >
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#5C3118", letterSpacing: "0.05em" }}>
              GiftButler
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#111111",
              lineHeight: 1.1,
              marginBottom: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>No more guessing.</span>
            <span>Just the right gift.</span>
          </div>

          {/* Subtext */}
          <div
            style={{
              fontSize: "26px",
              color: "#888888",
              display: "flex",
            }}
          >
            Drop hints. Share your link. Get gifts you actually want.
          </div>
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            fontSize: "20px",
            fontWeight: 600,
            color: "#AAAAAA",
            display: "flex",
          }}
        >
          giftbutler.io
        </div>
      </div>
    ),
    size,
  );
}
