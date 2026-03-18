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
            display: "flex",
          }}
        />

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "0 80px",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#78716c",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "24px",
              display: "flex",
            }}
          >
            GiftButler
          </div>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.1,
              marginBottom: "12px",
              display: "flex",
            }}
          >
            Stop answering
          </div>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 800,
              color: "#1c1917",
              lineHeight: 1.1,
              marginBottom: "32px",
              display: "flex",
            }}
          >
            &ldquo;what do you want?&rdquo;
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#78716c",
              display: "flex",
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
            backgroundColor: "#fef3c7",
            borderRadius: "9999px",
            padding: "10px 28px",
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#92400e" }}>
            Free forever · AI-powered · giftbutler.io
          </span>
        </div>
      </div>
    ),
    size,
  );
}
