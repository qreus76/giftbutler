import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 256,
          height: 256,
          backgroundColor: "#fbbf24",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: "white",
            fontFamily: "serif",
            lineHeight: 1,
            marginTop: 24,
            display: "flex",
          }}
        >
          G
        </div>
      </div>
    ),
    size,
  );
}
