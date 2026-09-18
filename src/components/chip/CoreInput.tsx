"use client";

import { motion } from "framer-motion";
import { useChip } from "@/lib/store/chip";

/**
 * "+$12.81 CORE INPUT" — appears next to the core the moment a signal lands,
 * rises, fades. One line, no sparks. Landed fees stay in the store until the
 * cap evicts them, so the animation simply ends invisible.
 */
export function CoreInput() {
  const fees = useChip((s) => s.fees);
  const landed = fees.filter((f) => f.landed).slice(-4);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {landed.map((f, i) => (
        <motion.div
          key={f.id}
          className="absolute left-1/2 top-[38%] flex items-baseline gap-2 whitespace-nowrap"
          style={{ marginLeft: 24 + (i % 2) * 18 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 1, 1, 0], y: [8, 0, -10, -26] }}
          transition={{ duration: 2.3, times: [0, 0.12, 0.6, 1], ease: "easeOut" }}
        >
          <span className="num text-[18px] text-energy">+${f.amountUsd.toFixed(2)}</span>
          <span className="label text-silver">CORE INPUT</span>
        </motion.div>
      ))}
    </div>
  );
}
