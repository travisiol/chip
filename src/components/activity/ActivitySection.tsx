"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { DemoChip } from "@/components/ui/DemoChip";
import { Label } from "@/components/ui/Label";
import { Num } from "@/components/ui/Num";
import { fmtInt, fmtUsd } from "@/lib/format";
import { useMounted } from "@/lib/hooks";
import { reveal, revealDelayed } from "@/lib/motion";
import { useChip } from "@/lib/store/chip";
import { ActivityFeed } from "./ActivityFeed";

/** LIVE CORE ACTIVITY on the landing: the feed and three figures about the flow. */
export function ActivitySection() {
  const mounted = useMounted();
  const trades = useChip((s) => s.trades);
  const feeFlow = useChip((s) => s.feeFlow);
  const routedRecent = trades.slice(0, 50).reduce((s, t) => s + t.feeToCoreUsd, 0);

  return (
    <section id="activity" className="relative mx-auto max-w-[1440px] px-5 py-24 md:px-8 md:py-32">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <motion.div {...reveal}>
          <div className="label flex items-center gap-2">
            Live core activity <DemoChip />
          </div>
          <h2 className="display mt-3 text-[clamp(34px,5vw,64px)]">EVERY SIGNAL, LOGGED.</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-silver">Inputs as they land, power checkpoints, executions, new cycles. In LIVE mode every input carries its transaction.</p>

          <dl className="mt-10 grid grid-cols-3 gap-6">
            <div>
              <Label>Trades seen</Label>
              <dd className="num mt-2 text-[24px] text-ink">{mounted ? fmtInt(trades.length) : "—"}</dd>
            </div>
            <div>
              <Label>Routed · last 50</Label>
              <dd className="num mt-2 text-[24px] text-ink">{mounted ? <Num value={routedRecent} format={(v) => fmtUsd(v, 0)} /> : "—"}</dd>
            </div>
            <div>
              <Label>To core / trade</Label>
              <dd className="num mt-2 text-[24px] text-ink">{mounted && feeFlow ? `${(feeFlow.toCoreBps / 100).toFixed(2)}%` : "—"}</dd>
            </div>
          </dl>

          <Link href="/activity" className="btn btn-ghost btn-sm mt-10">
            <span>FULL ACTIVITY</span>
          </Link>
        </motion.div>

        <motion.div className="panel p-5 md:p-7" {...revealDelayed(0.1)}>
          <ActivityFeed limit={5} />
        </motion.div>
      </div>
    </section>
  );
}
