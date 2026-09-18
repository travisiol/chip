"use client";

import { motion } from "framer-motion";
import { ChipMark } from "@/components/brand/ChipMark";
import { ReserveButton, TradeButton } from "@/components/ui/TradeButton";
import { reveal } from "@/lib/motion";

/** Minimal dark section: a large chip silhouette, POWER THE CORE., the two buttons, the name. */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-5 py-32 md:px-8 md:py-44">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-aluminum/[0.06]" aria-hidden>
        <ChipMark size={620} pins energy={false} />
      </div>
      <motion.div className="relative mx-auto flex max-w-[1440px] flex-col items-center text-center" {...reveal}>
        <h2 className="display text-[clamp(44px,8vw,120px)]">POWER THE CORE.</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <TradeButton />
          <ReserveButton />
        </div>
        <div className="mt-20 flex flex-col items-center gap-3">
          <ChipMark size={36} className="text-ink" />
          <div className="display text-2xl">CHIP</div>
          <div className="display-wide text-[11px] tracking-[0.22em] text-silver">TRADE. POWER. BUILD NVDA.</div>
        </div>
      </motion.div>
    </section>
  );
}
