"use client";

import { motion } from "framer-motion";
import { ChipStage } from "@/components/chip/ChipStage";
import { DemoChip } from "@/components/ui/DemoChip";
import { Label } from "@/components/ui/Label";
import { Num } from "@/components/ui/Num";
import { ReserveButton, TradeButton } from "@/components/ui/TradeButton";
import { STATUS_LABEL } from "@/lib/chip/machine";
import { fmtAmount, fmtCycle, fmtPct, fmtUsd } from "@/lib/format";
import { useMounted } from "@/lib/hooks";
import { easeOutExpo } from "@/lib/motion";
import { remainingUsd, useChip } from "@/lib/store/chip";

const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: easeOutExpo } });

/**
 * Full viewport. Desktop: CHIP / TRADE. POWER. BUILD NVDA. on the left with
 * the core power and cycle, the processor in the centre, the reserve and
 * the next execution on the right. Phones: name, tagline, the chip, the
 * figures, the buttons. A dashboard, not a poster — no bordered cards.
 */
export function Hero() {
  const mounted = useMounted();
  const chip = useChip((s) => s.chip);
  const reserve = useChip((s) => s.reserve);
  const nvda = useChip((s) => s.prices.NVDA);
  const remaining = remainingUsd(chip);
  // Figures appear once the first real values are in: no glide from a placeholder.
  const sync = useChip((s) => s.sync);
  const ready = mounted && chip.lastUpdated > 0 && sync !== "syncing";

  return (
    <section id="core" className="relative min-h-svh overflow-x-clip pt-16">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1440px] grid-cols-1 content-center gap-6 px-5 pb-10 md:px-8 lg:grid-cols-[minmax(280px,1fr)_minmax(360px,1.35fr)_minmax(240px,0.9fr)] lg:grid-rows-[auto_auto_auto] lg:items-center lg:gap-x-8 lg:gap-y-10">
        {/* Name and tagline — left column, first row. */}
        <div className="pt-10 lg:col-start-1 lg:row-start-1 lg:self-end lg:pt-0">
          <motion.h1 className="display text-[clamp(64px,9vw,128px)] text-ink" {...rise(0.05)}>
            CHIP
          </motion.h1>
          <motion.p className="display-wide mt-4 text-[clamp(13px,1.3vw,17px)] tracking-[0.2em] text-aluminum" {...rise(0.15)}>
            TRADE. POWER. <span className="text-energy">BUILD NVDA.</span>
          </motion.p>
          <motion.p className="mt-3 text-[15px] text-silver" {...rise(0.22)}>
            Every trade powers the chip.
          </motion.p>
        </div>

        {/* The processor — centre column, all rows. */}
        <motion.div className="mx-auto w-full max-w-[720px] lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:max-w-none" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.1, ease: easeOutExpo }}>
          <ChipStage className="aspect-square w-full" />
        </motion.div>

        {/* Core power and cycle — left column, second row. */}
        <motion.dl className="grid grid-cols-2 gap-x-8 gap-y-7 lg:col-start-1 lg:row-start-2" {...rise(0.3)}>
          <div>
            <Label>Core power</Label>
            <dd className="num mt-2 text-[clamp(38px,4vw,56px)] leading-none text-ink">{ready ? <Num value={chip.corePowerPercent} format={(v) => fmtPct(v, 1)} /> : "—"}</dd>
            <div className="label mt-2 flex items-center gap-2 text-silver">
              <span className={`dot ${chip.status === "POWERING" || chip.status === "FULL" ? "dot-live" : ""}`} />
              {mounted ? STATUS_LABEL[chip.status] : "—"}
            </div>
          </div>
          <div>
            <Label>Current cycle</Label>
            <dd className="num mt-2 text-[clamp(38px,4vw,56px)] leading-none text-ink">{ready ? fmtCycle(chip.currentCycle) : "—"}</dd>
            <div className="mt-2">
              <DemoChip />
            </div>
          </div>
        </motion.dl>

        {/* Reserve and next execution — right column, all rows. */}
        <motion.dl className="grid grid-cols-2 gap-x-8 gap-y-7 lg:col-start-3 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-10 lg:pl-4" {...rise(0.35)}>
          <div>
            <Label>NVDA reserve</Label>
            <dd className="num mt-2 text-[clamp(30px,3vw,44px)] leading-none text-ink">{ready && reserve.reserveValueUsd != null ? <Num value={reserve.reserveValueUsd} format={(v) => fmtUsd(v, 0)} rate={4} /> : "—"}</dd>
            <div className="mono mt-2 text-[12px] text-silver">
              {ready ? <Num value={reserve.nvdaTokenBalance} format={(v) => fmtAmount(v, 2)} rate={4} /> : "—"} NVDA
              {ready && nvda?.stale ? <span className="label ml-2 text-muted">· price delayed</span> : null}
            </div>
          </div>
          <div>
            <Label>Next execution</Label>
            <dd className="num mt-2 text-[clamp(30px,3vw,44px)] leading-none text-ink">{ready ? <Num value={remaining} format={(v) => fmtUsd(v, 0)} /> : "—"}</dd>
            <div className="mono mt-2 text-[12px] text-silver">
              remaining · {ready ? <Num value={chip.currentInputUsd} format={(v) => fmtUsd(v, 2)} /> : "—"} / {fmtUsd(chip.targetInputUsd, 0)}
            </div>
          </div>
          <div className="col-span-2 hidden lg:block">
            <Label>Loop</Label>
            <div className="mono mt-2 text-[11px] leading-[1.9] text-muted">
              TRADE → FEES → CORE
              <br />
              100% → NVDA EXECUTION
              <br />
              RESERVE ↑ → RESET
            </div>
          </div>
        </motion.dl>

        {/* Buttons — left column, third row; last on phones. */}
        <motion.div className="flex flex-wrap gap-3 lg:col-start-1 lg:row-start-3 lg:self-start" {...rise(0.4)}>
          <TradeButton />
          <ReserveButton />
        </motion.div>
      </div>
    </section>
  );
}
