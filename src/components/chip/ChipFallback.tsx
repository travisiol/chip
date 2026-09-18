"use client";

import { useMemo } from "react";
import { litFraction, toPathData, traceNetwork } from "@/lib/chip/traces";
import { useChip } from "@/lib/store/chip";

const SIZE = 400;
const S = SIZE / 2;
const SCALE = S * 0.72;

/**
 * The chip as an SVG, top-down, lit by the same power level as the WebGL
 * scene. Stands in while the scene loads, when WebGL is unavailable, and in
 * the core-map section.
 */
export function ChipFallback({ className = "", dim = false, power }: { className?: string; dim?: boolean; power?: number }) {
  const storePower = useChip((s) => s.chip.corePowerPercent);
  const status = useChip((s) => s.chip.status);
  const p = (power ?? storePower) / 100;
  const net = useMemo(() => traceNetwork(), []);
  const exec = status === "EXECUTING" || status === "CONFIRMED";
  const core = net.core * SCALE;
  const pkg = S * 0.86;
  const pin = 10;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={`h-full w-full ${dim ? "opacity-60" : ""} ${className}`} aria-hidden>
      {/* Package and frame. */}
      <rect x={S - pkg} y={S - pkg} width={pkg * 2} height={pkg * 2} rx={8} fill="#0b0e10" stroke="#2a3135" strokeWidth={2} />
      <rect x={S - SCALE - 8} y={S - SCALE - 8} width={(SCALE + 8) * 2} height={(SCALE + 8) * 2} rx={3} fill="#0d1113" stroke="#3a4347" strokeWidth={1.5} />
      {/* Pins. */}
      {net.pins.map((q, i) => {
        const cx = S + q.at.x * (pkg + pin / 2);
        const cy = S - q.at.y * (pkg + pin / 2);
        const horizontal = q.side === 1 || q.side === 3;
        return <rect key={i} x={cx - (horizontal ? pin / 2 : 2.5)} y={cy - (horizontal ? 2.5 : pin / 2)} width={horizontal ? pin : 5} height={horizontal ? 5 : pin} fill="#b8bfc4" />;
      })}
      {/* Traces: a dim copy under a lit copy. */}
      {net.traces.map((t) => (
        <path key={`d${t.id}`} d={toPathData(t.points, SCALE, S, S)} fill="none" stroke="#2b3236" strokeWidth={1.4 * t.width} strokeLinejoin="miter" />
      ))}
      {net.traces.map((t) => {
        const lit = t.kind === 3 ? (exec ? 1 : 0) : litFraction(t, p);
        if (lit <= 0) return null;
        return (
          <path
            key={`l${t.id}`}
            d={toPathData(t.points, SCALE, S, S)}
            fill="none"
            stroke={t.kind === 3 ? "#e6ffc4" : "#B7FF39"}
            strokeWidth={1.4 * t.width}
            strokeLinejoin="miter"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - lit}
            style={{ filter: "drop-shadow(0 0 3px rgba(183,255,57,0.5))" }}
          />
        );
      })}
      {net.vias.map((v, i) => (
        <circle key={i} cx={S + v.x * SCALE} cy={S - v.y * SCALE} r={2.2} fill="#7c8587" />
      ))}
      {/* Core. */}
      <rect x={S - core} y={S - core} width={core * 2} height={core * 2} rx={3} fill="#111517" stroke="#2a3135" strokeWidth={1.5} />
      <rect x={S - core * 0.8} y={S - core * 0.8} width={core * 1.6} height={core * 1.6} rx={2} fill="#B7FF39" opacity={0.08 + p * 0.85} style={{ filter: `drop-shadow(0 0 ${6 + p * 14}px rgba(183,255,57,${0.3 + p * 0.5}))` }} />
    </svg>
  );
}
