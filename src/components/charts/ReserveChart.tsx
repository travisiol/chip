"use client";

import { useState } from "react";
import { fmtAmount, fmtCycle, fmtDate, fmtUsd } from "@/lib/format";

export interface ReservePoint {
  at: number;
  nvda: number;
  usd: number | null;
  cycle: number;
}

/**
 * Reserve history as a step line: the reserve only ever moves when a
 * execution lands, so each execution is a step up. One series, one hue,
 * a crosshair with a tooltip. No candlesticks — there is nothing to candle.
 */
export function ReserveChart({ points, valuation = "acquisition", className = "" }: { points: ReservePoint[]; valuation?: "acquisition" | "mark"; className?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const usdMode = points.length > 0 && points.every((p) => p.usd != null);
  const value = (p: ReservePoint) => (usdMode ? (p.usd as number) : p.nvda);

  if (points.length < 2) {
    return (
      <div className={`flex h-[260px] items-center justify-center border border-dashed border-metal-2 ${className}`}>
        <span className="mono text-[12px] text-muted">{points.length === 0 ? "No executions yet — the chart starts with the first one." : "One execution so far. The line needs two."}</span>
      </div>
    );
  }

  const t0 = points[0].at;
  const t1 = points[points.length - 1].at;
  const span = Math.max(1, t1 - t0);
  const vmax = Math.max(...points.map(value)) * 1.08;
  const X = (t: number) => ((t - t0) / span) * 100;
  const Y = (v: number) => 100 - (v / vmax) * 92;

  // Step-after path: hold the previous value until the next purchase.
  let d = `M ${X(points[0].at)} ${Y(value(points[0]))}`;
  for (let i = 1; i < points.length; i++) {
    d += ` H ${X(points[i].at)} V ${Y(value(points[i]))}`;
  }
  const area = `${d} V 100 H 0 Z`;

  const gridLevels = [0.25, 0.5, 0.75, 1].map((f) => f * (vmax / 1.08));
  const h = hover != null ? points[hover] : null;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = t0 + ((e.clientX - rect.left) / rect.width) * span;
    let best = 0;
    for (let i = 0; i < points.length; i++) if (points[i].at <= t) best = i;
    setHover(best);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <span className="label">{usdMode ? (valuation === "acquisition" ? "RESERVE VALUE · USD AT ACQUISITION" : "RESERVE VALUE · USD AT CURRENT PRICE") : "RESERVE · NVDA BALANCE"}</span>
        <span className="mono text-[11px] text-muted">{points.length} executions</span>
      </div>
      <div className="relative mt-4 h-[260px] select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`Reserve history, ${points.length} executions`}>
        {/* Grid */}
        {gridLevels.map((v) => (
          <div key={v} className="absolute inset-x-0 border-t border-graphite" style={{ top: `${Y(v)}%` }}>
            <span className="mono absolute left-0 -top-4 text-[10px] text-muted">{usdMode ? fmtUsd(v, 0) : fmtAmount(v, 2)}</span>
          </div>
        ))}
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="rv-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#B7FF39" stopOpacity="0.22" />
              <stop offset="1" stopColor="#B7FF39" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#rv-area)" />
          <path d={d} fill="none" stroke="#B7FF39" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        {/* Last value, direct label */}
        <div className="absolute" style={{ left: "100%", top: `${Y(value(points[points.length - 1]))}%` }}>
          <div className="absolute -top-2 h-2 w-2 -translate-x-1 rounded-full bg-energy ring-2 ring-void" />
        </div>
        {/* Crosshair + tooltip */}
        {h ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 w-px bg-silver/50" style={{ left: `${X(h.at)}%` }} />
            <div className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-energy-2 ring-2 ring-void" style={{ left: `${X(h.at)}%`, top: `${Y(value(h))}%` }} />
            <div className={`panel pointer-events-none absolute top-2 w-[180px] p-3 ${X(h.at) > 60 ? "-translate-x-full" : ""}`} style={{ left: `${X(h.at)}%`, marginLeft: X(h.at) > 60 ? -10 : 10 }}>
              <div className="display-wide text-[10px] tracking-[0.16em]">CYCLE {fmtCycle(h.cycle)}</div>
              <div className="num mt-1 text-lg">{usdMode ? fmtUsd(h.usd as number, 0) : `${fmtAmount(h.nvda, 4)} NVDA`}</div>
              <div className="mono mt-0.5 text-[10px] text-muted">
                {fmtAmount(h.nvda, 4)} NVDA · {fmtDate(h.at)}
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div className="mono mt-2 flex justify-between text-[10px] text-muted">
        <span>{fmtDate(t0)}</span>
        <span>{fmtDate(t1)}</span>
      </div>
    </div>
  );
}
