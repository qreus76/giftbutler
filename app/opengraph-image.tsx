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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "#78716c",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "24px",
            }}
          >
            GiftButler
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: "800",
              color: "#1c1917",
              lineHeight: 1.1,
              marginBottom: "32px",
            }}
          >
            Stop answering<br />&ldquo;what do you want?&rdquo;
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#78716c",
              lineHeight: 1.5,
            }}
          >
            Drop hints. Share your link. Get gifts you actually want.
          </div>
        </div>

        {/* Bottom tag */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "#fef3c7",
            borderRadius: "9999px",
            padding: "10px 24px",
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#92400e" }}>
            Free forever · AI-powered · giftbutler.io
          </span>
        </div>
      </div>
    ),
    size,
  );
}
