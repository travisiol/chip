"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { DemoChip } from "@/components/ui/DemoChip";
import { setRegion, signals } from "@/lib/chip/signals";
import { litFraction, toPathData, traceNetwork } from "@/lib/chip/traces";
import { fmtPct } from "@/lib/format";
import { reveal } from "@/lib/motion";
import { useChip } from "@/lib/store/chip";

type Region = NonNullable<typeof signals.region>;

const REGIONS: Array<{ id: Region; title: string; body: string }> = [
  { id: "input", title: "INPUT BUS", body: "Trades on the CHIP curve generate fees. The configured share enters the chip here — one signal per trade, through the pins on three sides." },
  { id: "processing", title: "PROCESSING LAYER", body: "Fan-out traces and the ring bus. Inputs are valued in USD at the live ETH price and routed toward the core; the layer lights as the level rises." },
  { id: "core", title: "POWER CORE", body: "Accumulates the configured reserve allocation until the execution threshold is reached." },
  { id: "execution", title: "EXECUTION BUS", body: "At 100% core power, the configured NVDA Stock Token purchase is executed. It leaves the core through this bus." },
  { id: "output", title: "RESERVE OUTPUT", body: "The NVDA Stock Tokens land in the reserve wallet. The chip powers down; the next cycle begins." },
];

const SIZE = 640;
const S = SIZE / 2;
const SCALE = S * 0.68;
const d2s = (v: number) => S + v * SCALE;
const rect = (x0: number, y0: number, x1: number, y1: number) => ({ x: d2s(x0), y: S - y1 * SCALE, width: (x1 - x0) * SCALE, height: (y1 - y0) * SCALE });

/**
 * CORE MAP. The chip from the top, its five regions under the pointer. The
 * traces are the same network the hero renders, lit by the same power.
 */
export function CoreMap() {
  const [hover, setHover] = useState<Region | null>(null);
  const power = useChip((s) => s.chip.corePowerPercent);
  const status = useChip((s) => s.chip.status);
  const net = useMemo(() => traceNetwork(), []);
  const p = power / 100;
  const exec = status === "EXECUTING" || status === "CONFIRMED";
  const core = net.core;
  const ring = net.ring;

  const enter = (r: Region) => {
    setHover(r);
    setRegion(r);
  };
  const leave = () => {
    setHover(null);
    setRegion(null);
  };

  const shapes: Record<Region, ReturnType<typeof rect>[]> = {
    input: [rect(-1.18, 0.78, 0.78, 1.18), rect(-1.18, -1.18, -0.78, 1.18), rect(-1.18, -1.18, 0.78, -0.78)],
    processing: [rect(-0.78, core, 0.78, 0.78), rect(-0.78, -0.78, 0.78, -core), rect(-0.78, -core, -core, core)],
    core: [rect(-core, -core, core, core)],
    execution: [rect(core, -ring, 0.78, ring)],
    output: [rect(0.78, -1.18, 1.18, 1.18)],
  };
  const active = REGIONS.find((r) => r.id === hover) ?? null;

  return (
    <section id="core-map" className="relative mx-auto max-w-[1440px] px-5 py-24 md:px-8 md:py-32">
      <motion.div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16" {...reveal}>
        <div className="order-2 lg:order-1">
          <div className="label">Core map</div>
          <h2 className="display mt-3 text-[clamp(34px,5vw,64px)]">FIVE REGIONS. ONE LOOP.</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-silver">Hover a region of the die. The processor in the hero lights the same region.</p>

          <ul className="mt-8 flex flex-col">
            {REGIONS.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`row w-full grid-cols-[20px_1fr] text-left transition-colors ${hover === r.id ? "text-ink" : "text-silver hover:text-ink"}`}
                  onPointerEnter={() => enter(r.id)}
                  onPointerLeave={leave}
                  onFocus={() => enter(r.id)}
                  onBlur={leave}
                >
                  <span className={`dot ${hover === r.id ? "dot-live" : ""}`} />
                  <span className="display-wide text-[12px] tracking-[0.18em]">{r.title}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 min-h-[92px]">
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div key={active.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.25 }} className="panel-metal p-4">
                  <div className="display-wide text-[11px] tracking-[0.2em] text-energy">{active.title}</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-silver">{active.body}</p>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mono text-[11px] leading-relaxed text-muted">
                  CORE POWER {fmtPct(power, 1)} · {exec ? "EXECUTION BUS ACTIVE" : "INPUT BUS OPEN"} <DemoChip className="ml-2 align-middle" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto h-auto w-full max-w-[640px]" role="img" aria-label="Top-down map of the chip: input bus, processing layer, power core, execution bus, reserve output">
            {/* Package and die. */}
            <rect x={S - S * 0.9} y={S - S * 0.9} width={S * 1.8} height={S * 1.8} rx={10} fill="#0b0e10" stroke="#2a3135" strokeWidth={2} />
            <rect x={S - SCALE - 10} y={S - SCALE - 10} width={(SCALE + 10) * 2} height={(SCALE + 10) * 2} rx={3} fill="#0d1113" stroke="#3a4347" strokeWidth={1.5} />
            {net.pins.map((q, i) => {
              const horizontal = q.side === 1 || q.side === 3;
              const cx = S + q.at.x * (S * 0.9 + 8);
              const cy = S - q.at.y * (S * 0.9 + 8);
              return <rect key={i} x={cx - (horizontal ? 8 : 3)} y={cy - (horizontal ? 3 : 8)} width={horizontal ? 16 : 6} height={horizontal ? 6 : 16} fill="#b8bfc4" />;
            })}
            {net.traces.map((t) => (
              <path key={`d${t.id}`} d={toPathData(t.points, SCALE, S, S)} fill="none" stroke="#2b3236" strokeWidth={2.2 * t.width} strokeLinejoin="miter" />
            ))}
            {net.traces.map((t) => {
              const lit = t.kind === 3 ? (exec ? 1 : 0) : litFraction(t, p);
              if (lit <= 0) return null;
              return <path key={`l${t.id}`} d={toPathData(t.points, SCALE, S, S)} fill="none" stroke={t.kind === 3 ? "#e6ffc4" : "#B7FF39"} strokeWidth={2.2 * t.width} strokeLinejoin="miter" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - lit} />;
            })}
            {net.vias.map((v, i) => (
              <circle key={i} cx={d2s(v.x)} cy={S - v.y * SCALE} r={3} fill="#7c8587" />
            ))}
            <rect {...rect(-core, -core, core, core)} rx={4} fill="#111517" stroke="#2a3135" strokeWidth={1.5} />
            <rect {...rect(-core * 0.8, -core * 0.8, core * 0.8, core * 0.8)} rx={3} fill="#B7FF39" opacity={0.1 + p * 0.85} />

            {/* Region overlays (hover targets), labels on hover. */}
            {REGIONS.map((r) => (
              <g key={r.id} onPointerEnter={() => enter(r.id)} onPointerLeave={leave} style={{ cursor: "pointer" }}>
                {shapes[r.id].map((s, i) => (
                  <rect key={i} {...s} fill={hover === r.id ? "rgba(114,255,122,0.14)" : "rgba(255,255,255,0)"} stroke={hover === r.id ? "rgba(183,255,57,0.8)" : "rgba(255,255,255,0)"} strokeWidth={1} strokeDasharray="4 3" style={{ transition: "fill 200ms, stroke 200ms" }} />
                ))}
              </g>
            ))}
            {/* Region names, on the map. */}
            <g fontFamily="var(--font-mono)" fontSize={10} letterSpacing={1.6} fill="#7c8587">
              <text x={d2s(-1.17)} y={S - 1.03 * SCALE - 4}>INPUT BUS</text>
              <text x={d2s(-0.76)} y={S - 0.66 * SCALE}>PROCESSING</text>
              <text x={S} y={S - core * SCALE - 8} textAnchor="middle">POWER CORE</text>
              <text x={d2s(0.32)} y={S + (ring + 0.1) * SCALE}>EXECUTION BUS</text>
              <text x={d2s(1.17)} y={S + 1.1 * SCALE} textAnchor="end">
                RESERVE OUTPUT
              </text>
            </g>
          </svg>
        </div>
      </motion.div>
    </section>
  );
}
