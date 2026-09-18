"use client";

import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { DemoChip } from "@/components/ui/DemoChip";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/hooks";
import { reveal, revealDelayed } from "@/lib/motion";
import { useChip } from "@/lib/store/chip";

const STEPS = [
  { n: "01", title: "TRADE", body: "CHIP activity generates fees according to the implemented token mechanism." },
  { n: "02", title: "POWER", body: "The configured reserve allocation powers the chip." },
  { n: "03", title: "EXECUTE", body: "At 100% core power, the configured NVDA Stock Token purchase is executed." },
  { n: "04", title: "BUILD", body: "The NVDA-linked reserve grows cycle after cycle." },
];

/** Node centres and one continuous trace through them, horizontal (desktop) or vertical (phones). */
function flow(vertical: boolean) {
  const W = vertical ? 160 : 1200;
  const H = vertical ? 760 : 150;
  const centres = STEPS.map((_, i) => (vertical ? { x: 80, y: 70 + i * 206 } : { x: 150 + i * 300, y: 75 }));
  const pad = 26;
  let d = "";
  for (let i = 0; i < centres.length - 1; i++) {
    const a = centres[i];
    const b = centres[i + 1];
    if (vertical) {
      const y0 = a.y + pad;
      const y1 = b.y - pad;
      const mid = (y0 + y1) / 2;
      d += `${i === 0 ? "M" : "L"}${a.x} ${y0} L${a.x} ${mid - 30} L${a.x + 22} ${mid - 8} L${a.x + 22} ${mid + 8} L${a.x} ${mid + 30} L${a.x} ${y1} `;
    } else {
      const x0 = a.x + pad;
      const x1 = b.x - pad;
      const mid = (x0 + x1) / 2;
      d += `${i === 0 ? "M" : "L"}${x0} ${a.y} L${mid - 40} ${a.y} L${mid - 18} ${a.y - 22} L${mid + 18} ${a.y - 22} L${mid + 40} ${a.y} L${x1} ${a.y} `;
    }
  }
  return { W, H, centres, d: d.trim(), pad };
}

/**
 * TRADE → POWER → EXECUTE → BUILD as one circuit. The trace lights up with
 * the scroll and a packet rides its tip; the nodes are pads, not cards.
 */
export function HowItWorks() {
  const vertical = useMediaQuery("(max-width: 767px)");
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const packetRef = useRef<SVGRectElement>(null);
  const toCoreBps = useChip((s) => s.feeFlow?.toCoreBps ?? null);
  const f = useMemo(() => flow(vertical), [vertical]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.6 });
  const pathLength = useTransform(smooth, [0, 1], [0, 1]);

  // The packet rides the tip of the lit trace; written straight to the DOM, no re-render per scroll frame.
  const movePacket = (p: number) => {
    const path = pathRef.current;
    const packet = packetRef.current;
    if (!path || !packet) return;
    const len = path.getTotalLength();
    const at = path.getPointAtLength(Math.max(0, Math.min(1, p)) * len);
    const ahead = path.getPointAtLength(Math.min(len, Math.max(0, Math.min(1, p)) * len + 1));
    const angle = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
    packet.setAttribute("transform", `translate(${at.x} ${at.y}) rotate(${angle})`);
    packet.setAttribute("opacity", p > 0.01 && p < 0.995 ? "1" : "0");
  };
  useMotionValueEvent(smooth, "change", movePacket);
  useEffect(() => {
    movePacket(reduced ? 1 : smooth.get());
  });

  return (
    <section id="how" className="relative mx-auto max-w-[1440px] px-5 py-24 md:px-8 md:py-32" ref={ref}>
      <motion.div className="flex flex-wrap items-end justify-between gap-4" {...reveal}>
        <div>
          <div className="label">How CHIP works</div>
          <h2 className="display mt-3 text-[clamp(34px,5vw,64px)]">
            TRADE → POWER → <span className="text-energy">EXECUTE</span> → BUILD
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-silver">
          One loop, one machine. {toCoreBps != null ? `${(toCoreBps / 100).toFixed(2)}% of every trade` : "The configured share of every trade"} reaches the core; the core executes NVDA at 100 %; the reserve grows; the next cycle starts.{" "}
          <DemoChip className="ml-1 align-middle" />
        </p>
      </motion.div>

      <div className={`mt-14 ${vertical ? "grid grid-cols-[96px_1fr] gap-4" : ""}`}>
        <motion.svg viewBox={`0 0 ${f.W} ${f.H}`} className={vertical ? "h-auto w-full" : "h-auto w-full"} {...reveal} aria-hidden>
          {/* Dark copper trace, then the lit trace on top. */}
          <path d={f.d} fill="none" stroke="#2b3236" strokeWidth={vertical ? 3 : 3} strokeLinejoin="miter" />
          <motion.path ref={pathRef} d={f.d} fill="none" stroke="#B7FF39" strokeWidth={vertical ? 3 : 3} strokeLinejoin="miter" style={{ pathLength: reduced ? 1 : pathLength, filter: "drop-shadow(0 0 4px rgba(183,255,57,0.55))" }} />
          <rect ref={packetRef} x={-9} y={-3} width={18} height={6} rx={1} fill="#EEFFD6" opacity={0} />
          {/* Pads. */}
          {f.centres.map((c, i) => (
            <g key={i}>
              <rect x={c.x - f.pad} y={c.y - f.pad} width={f.pad * 2} height={f.pad * 2} rx={4} fill="#0b0e10" stroke="#3a4347" strokeWidth={1.5} />
              <rect x={c.x - f.pad + 6} y={c.y - f.pad + 6} width={f.pad * 2 - 12} height={f.pad * 2 - 12} rx={2} fill="none" stroke="#1c2124" strokeWidth={1} />
              <text x={c.x} y={c.y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill="#B8C0C4" letterSpacing={1}>
                {STEPS[i].n}
              </text>
              {/* Pin ticks on the pads. */}
              {[-12, 0, 12].map((o) => (
                <g key={o} stroke="#566064" strokeWidth={1.5}>
                  <line x1={c.x + o} y1={c.y - f.pad - 6} x2={c.x + o} y2={c.y - f.pad} />
                  <line x1={c.x + o} y1={c.y + f.pad} x2={c.x + o} y2={c.y + f.pad + 6} />
                </g>
              ))}
            </g>
          ))}
        </motion.svg>

        <div className={vertical ? "grid grid-cols-1 gap-[86px] pt-8" : "mt-6 grid grid-cols-4 gap-8"}>
          {STEPS.map((s, i) => (
            <motion.div key={s.n} className={vertical ? "" : "px-[2%] text-center"} {...revealDelayed(0.08 * i)}>
              <div className="label">Step {s.n}</div>
              <h3 className="display mt-2 text-[28px] text-ink">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-silver">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
