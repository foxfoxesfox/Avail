import { ImageResponse } from "next/og";

export const alt = "Avail: when is everyone free? Share one link, everyone marks their hours.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEADLINE = "AvailWhen is everyone free?";
const BODY = "Share one link. Everyone marks their hours. See the best times at a glance.";

// The site's face (Zen Kaku Gothic New), subset to just these words. Falls back to the default font if offline.
async function zen(weight: 400 | 700, text: string) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? { name: "Zen", data: await (await fetch(url)).arrayBuffer(), weight, style: "normal" as const } : null;
  } catch {
    return null;
  }
}

// The link preview chat apps show: paper page, the chosen-slot mark, the wordmark and the promise.
export default async function OpengraphImage() {
  const fonts = (await Promise.all([zen(700, HEADLINE), zen(400, BODY)])).filter((f) => f !== null);
  const dot = (x: number, y: number) => (
    <div key={`${x}-${y}`} style={{ position: "absolute", left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.55)" }} />
  );
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#f4f6f5", display: "flex", alignItems: "center", padding: "0 96px", gap: 72, fontFamily: "Zen" }}>
      <div style={{ position: "relative", width: 300, height: 300, borderRadius: 66, background: "#2d3e8c", display: "flex", flexShrink: 0 }}>
        {[[80, 80], [150, 80], [220, 80], [80, 150], [80, 220], [150, 220], [220, 220]].map(([x, y]) => dot(x, y))}
        <div style={{ position: "absolute", left: 115, top: 115, width: 140, height: 70, borderRadius: 15, background: "#fff" }} />
        <div style={{ position: "absolute", left: 232, top: 33, width: 36, height: 36, borderRadius: 18, background: "#e2412b" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", color: "#1e2328" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 96, fontWeight: 700, letterSpacing: -3 }}>
          Avail
          <div style={{ width: 26, height: 26, borderRadius: 13, background: "#e2412b", marginTop: 12 }} />
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, marginTop: 18, letterSpacing: -1 }}>When is everyone free?</div>
        <div style={{ fontSize: 32, color: "#4f5a64", marginTop: 16, maxWidth: 620, lineHeight: 1.35 }}>
          {BODY}
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
