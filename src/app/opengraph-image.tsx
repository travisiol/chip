import { ImageResponse } from "next/og";
import { MARK } from "@/components/brand/mark";

export const alt = "CHIP — Trade. Power. Build NVDA.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The share card: the mark, the name, the tagline, the loop — on the fab-black ground. */
export default function OpenGraphImage() {
  const { body, c, cWidth, core, lead, leadWidth, viewBox } = MARK;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#050606", color: "#F4F6F5", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "96px 96px" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px 84px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <svg width="96" height="96" viewBox={viewBox}>
              <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={body.r} fill="none" stroke="#B8C0C4" strokeWidth={1.6} />
              <path d={c} fill="none" stroke="#B7FF39" strokeWidth={cWidth} strokeLinecap="square" strokeLinejoin="miter" />
              <path d={lead} fill="none" stroke="#B7FF39" strokeWidth={leadWidth} strokeLinecap="square" />
              <rect x={core.x} y={core.y} width={core.w} height={core.h} rx={0.6} fill="#F4F6F5" />
            </svg>
            <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>CHIP</div>
          </div>
          <div style={{ marginTop: 40, fontSize: 40, letterSpacing: 8, color: "#E5EAEC", display: "flex", gap: 14 }}>
            <span>TRADE. POWER.</span>
            <span style={{ color: "#B7FF39" }}>BUILD NVDA.</span>
          </div>
          <div style={{ marginTop: 22, fontSize: 26, color: "#B8C0C4" }}>Every trade powers the chip.</div>
          <div style={{ marginTop: 64, fontSize: 20, letterSpacing: 4, color: "#7C8587", display: "flex", gap: 18 }}>
            <span>TRADE</span>
            <span style={{ color: "#B7FF39" }}>→</span>
            <span>FEES</span>
            <span style={{ color: "#B7FF39" }}>→</span>
            <span>CORE 100%</span>
            <span style={{ color: "#B7FF39" }}>→</span>
            <span>NVDA EXECUTION</span>
            <span style={{ color: "#B7FF39" }}>→</span>
            <span>RESERVE</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
