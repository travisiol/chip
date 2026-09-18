"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { reveal, revealDelayed } from "@/lib/motion";
import { CurrentCycle } from "./CurrentCycle";
import { CycleHistory } from "./CycleHistory";
import { ReserveStage } from "./ReserveStage";
import { ReserveStats } from "./ReserveStats";

/** THE RESERVE on the landing: the wafer stack, the four figures, the active cycle, the last cycles. */
export function ReserveSection() {
  return (
    <section id="reserve" className="relative mx-auto max-w-[1440px] px-5 py-24 md:px-8 md:py-32">
      <motion.div className="flex flex-wrap items-end justify-between gap-4" {...reveal}>
        <div>
          <div className="label">NVDA reserve</div>
          <h2 className="display mt-3 text-[clamp(34px,5vw,64px)]">THE RESERVE</h2>
          <p className="mt-3 text-[15px] text-silver">Built one cycle at a time.</p>
        </div>
        <Link href="/reserve" className="btn btn-ghost btn-sm">
          <span>VIEW RESERVE</span>
        </Link>
      </motion.div>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <motion.div {...revealDelayed(0.05)}>
          <ReserveStage className="aspect-[4/5] w-full max-w-[560px] lg:aspect-square" />
          <p className="label mt-2 text-center">One wafer per completed cycle · hover a wafer or a row · drag to turn</p>
        </motion.div>
        <div className="flex flex-col gap-10">
          <motion.div {...revealDelayed(0.1)}>
            <ReserveStats />
          </motion.div>
          <motion.div {...revealDelayed(0.15)}>
            <CurrentCycle />
          </motion.div>
        </div>
      </div>

      <motion.div className="mt-16" {...reveal}>
        <CycleHistory limit={5} />
      </motion.div>
    </section>
  );
}
