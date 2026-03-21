import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const imgBuffer = fs.readFileSync(path.join(process.cwd(), "public", "present_giving.png"));
  const base64 = imgBuffer.toString("base64");
  const imgSrc = `data:image/png;base64,${base64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background photo — cropped to top (portrait → landscape) */}
        <img
          src={imgSrc}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />

        {/* Gradient overlay — darkens bottom like the login page */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.85) 100%)",
            display: "flex",
          }}
        />

        {/* Top-left logo */}
        <div
          style={{
            position: "absolute",
            top: "48px",
            left: "60px",
            fontSize: "28px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            display: "flex",
          }}
        >
          GiftButler
        </div>

        {/* Bottom text block */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "60px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>No more guessing.</span>
            <span>Just the right gift.</span>
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "rgba(255,255,255,0.70)",
              display: "flex",
              marginTop: "4px",
            }}
          >
            Drop hints. Share your link. Get gifts you actually want.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
