import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const dot = { width: 12, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.55)", position: "absolute" } as const;

// Home-screen icon: the chosen-slot mark at full detail (iOS rounds the corners itself, so the tile is square).
export default function AppleIcon() {
  const grid = [[48, 48], [90, 48], [132, 48], [48, 90], [48, 132], [90, 132], [132, 132]];
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#2d3e8c", display: "flex", position: "relative" }}>
      {grid.map(([x, y]) => <div key={`${x}-${y}`} style={{ ...dot, left: x - 6, top: y - 6 }} />)}
      <div style={{ position: "absolute", left: 69, top: 69, width: 84, height: 42, borderRadius: 9, background: "#fff" }} />
      <div style={{ position: "absolute", left: 139, top: 31, width: 22, height: 22, borderRadius: 11, background: "#e2412b" }} />
    </div>,
    size,
  );
}
