"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toPathData, traceNetwork } from "@/lib/chip/traces";
import { introOverride, introSeen, markIntroSeen } from "@/lib/intro";
import { easeInOutQuart, easeOutExpo } from "@/lib/motion";

/**
 * The opening: 2.4 seconds, then the product.
 *   0.00  black
 *   0.15  a faint square processor outline draws itself
 *   0.65  one internal circuit activates
 *   0.90  another
 *   1.15  a third, the ring, and the core begins to glow
 *   1.55  CHIP
 *   2.05  fade to the application
 * Plays once per browser (localStorage), skippable, never with reduced motion.
 */
const TOTAL_MS = 2_400;
const SIZE = 220;
const S = SIZE / 2;

function shouldPlay(): boolean {
  const override = introOverride();
  if (override !== null) return override;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return !introSeen();
}

export default function IntroOverlay() {
  const [playing, setPlaying] = useState<boolean>(() => shouldPlay());

  const finish = useCallback(() => {
    markIntroSeen();
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(finish, TOTAL_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [playing, finish]);

  // Three fee traces (one per input side) and the ring, straight from the shared network.
  const paths = useMemo(() => {
    const net = traceNetwork();
    const fee = net.traces.filter((t) => t.kind === 0);
    const pick = [fee.find((t) => t.side === 0 && t.pin === 2), fee.find((t) => t.side === 3 && t.pin === 6), fee.find((t) => t.side === 2 && t.pin === 4)].filter(Boolean) as typeof fee;
    const scale = S * 0.86;
    return {
      traces: pick.map((t) => toPathData(t.points, scale, S, S)),
      ring: toPathData(net.traces.find((t) => t.kind === 1)?.points ?? [], scale, S, S),
      core: net.core * scale,
    };
  }, []);

  return (
    <AnimatePresence>
      {playing ? (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: easeInOutQuart } }}
          onClick={finish}
          role="presentation"
        >
          <motion.svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} initial={{ opacity: 0.9, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: easeOutExpo }} aria-hidden>
            {/* The processor outline. */}
            <motion.rect
              x={S * 0.1}
              y={S * 0.1}
              width={SIZE * 0.9}
              height={SIZE * 0.9}
              rx={10}
              fill="none"
              stroke="#3a4347"
              strokeWidth={1.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.15, ease: easeOutExpo }}
            />
            {/* Circuits, one after another. */}
            {paths.traces.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="#B7FF39"
                strokeWidth={2.2}
                strokeLinecap="square"
                strokeLinejoin="miter"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.42, delay: 0.65 + i * 0.25, ease: easeOutExpo }}
              />
            ))}
            <motion.path d={paths.ring} fill="none" stroke="#72FF7A" strokeWidth={1.6} strokeLinejoin="miter" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.9 }} transition={{ duration: 0.5, delay: 1.15, ease: easeOutExpo }} />
            {/* The core. */}
            <motion.rect
              x={S - paths.core}
              y={S - paths.core}
              width={paths.core * 2}
              height={paths.core * 2}
              rx={3}
              fill="#0b0e0f"
              stroke="#B7FF39"
              strokeWidth={1.2}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 1.2 }}
            />
            <motion.rect
              x={S - paths.core * 0.6}
              y={S - paths.core * 0.6}
              width={paths.core * 1.2}
              height={paths.core * 1.2}
              rx={2}
              fill="#B7FF39"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.35, 1, 0.85] }}
              transition={{ duration: 0.7, delay: 1.25, times: [0, 0.4, 0.7, 1] }}
              style={{ filter: "drop-shadow(0 0 10px rgba(183,255,57,0.8))" }}
            />
          </motion.svg>

          {/* CHIP */}
          <motion.div className="display mt-8 text-[clamp(2.5rem,7vw,5rem)] text-ink" initial={{ opacity: 0, letterSpacing: "0.3em" }} animate={{ opacity: 1, letterSpacing: "0.04em" }} transition={{ duration: 0.55, delay: 1.55, ease: easeOutExpo }}>
            CHIP
          </motion.div>

          <button type="button" className="label absolute right-6 bottom-6 hover:text-ink" onClick={finish}>
            SKIP →
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
