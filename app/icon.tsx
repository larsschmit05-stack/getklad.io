import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#f5e642",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 5,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 21,
            fontWeight: 700,
            color: "#1a1814",
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          K
        </div>
      </div>
    ),
    { ...size }
  );
}
