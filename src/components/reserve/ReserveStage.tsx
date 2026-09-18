"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useState } from "react";
import { SceneBoundary } from "@/components/ui/SceneBoundary";
import { fmtAmount, fmtClock, fmtCycle, fmtUsd } from "@/lib/format";
import { useChip } from "@/lib/store/chip";
import type { WaferHover } from "./ReserveStack";

const ReserveStack = dynamic(() => import("./ReserveStack"), { ssr: false, loading: () => <ReserveFallback dim /> });

/** The stack as an SVG: one ellipse per wafer. Stands in while the scene loads and when WebGL is unavailable. */
export function ReserveFallback({ dim = false }: { dim?: boolean }) {
  const count = useChip((s) => s.executions.length);
  const n = Math.min(count, 24);
  return (
    <svg viewBox="0 0 400 400" className={`h-full w-full ${dim ? "opacity-60" : ""}`} aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const y = 330 - i * 9;
        return (
          <g key={i}>
            <ellipse cx="200" cy={y} rx="120" ry="34" fill="#1a2023" stroke="#3a4347" strokeWidth="1" />
            <ellipse cx="200" cy={y - 5} rx="120" ry="34" fill="#8a949a" stroke={i === n - 1 ? "#B7FF39" : "#5a6469"} strokeWidth="1.2" />
          </g>
        );
      })}
      {count === 0 ? (
        <text x="200" y="210" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="#7c8587" letterSpacing="2">
          NO CYCLES YET
        </text>
      ) : null}
    </svg>
  );
}

/** The wafer stack with its hover card. */
export function ReserveStage({ className = "" }: { className?: string }) {
  const [hover, setHover] = useState<WaferHover | null>(null);
  const executions = useChip((s) => s.executions);
  const mode = useChip((s) => s.mode);
  const hit = hover ? executions.find((e) => e.cycle === hover.cycle) : null;

  return (
    <div className={`relative ${className}`}>
      <SceneBoundary fallback={<ReserveFallback />}>
        <ReserveStack className="h-full w-full" onHover={setHover} />
      </SceneBoundary>
      <AnimatePresence>
        {hover && hit ? (
          <motion.div
            key={hit.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="panel-metal pointer-events-none absolute z-10 px-3 py-2"
            style={{ left: Math.min(hover.x + 14, 9999), top: hover.y - 54 }}
          >
            <div className="display-wide text-[11px] tracking-[0.18em] text-ink">CYCLE {fmtCycle(hit.cycle)}</div>
            <div className="num mt-1 text-[16px] text-energy">{hit.inputUsd != null ? `+${fmtUsd(hit.inputUsd, 0)} NVDA` : `+${fmtAmount(hit.nvdaAmount, 4)} NVDA`}</div>
            <div className="mono mt-0.5 text-[10px] text-muted">
              {fmtAmount(hit.nvdaAmount, 4)} NVDA · {fmtClock(hit.at)}
              {mode === "demo" ? " · DEMO" : ""}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
