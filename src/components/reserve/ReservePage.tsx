"use client";

import { ReserveChart } from "@/components/charts/ReserveChart";
import { DemoChip } from "@/components/ui/DemoChip";
import { StateNotice } from "@/components/ui/StateNotice";
import { ReserveButton, TradeButton } from "@/components/ui/TradeButton";
import { refreshLive } from "@/components/ChipRuntime";
import { useMounted } from "@/lib/hooks";
import { reserveSeries } from "@/lib/reserve/cycles";
import { useChip } from "@/lib/store/chip";
import { CurrentCycle } from "./CurrentCycle";
import { CycleHistory } from "./CycleHistory";
import { ReserveStage } from "./ReserveStage";
import { ReserveStats } from "./ReserveStats";

/** /reserve — the whole reserve: the stack, the figures, the value history, every completed cycle. */
export function ReservePage() {
  const mounted = useMounted();
  const executions = useChip((s) => s.executions);
  const price = useChip((s) => s.prices.NVDA);
  const sync = useChip((s) => s.sync);
  const error = useChip((s) => s.error);
  const mode = useChip((s) => s.mode);
  const series = reserveSeries(executions, price?.price ?? null);
  const valuation = executions.length > 0 && executions.every((e) => e.executionPrice != null) ? "acquisition" : "mark";

  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-28 pb-24 md:px-8">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="label flex items-center gap-2">
            NVDA reserve <DemoChip />
          </div>
          <h1 className="display mt-3 text-[clamp(40px,6vw,88px)]">THE RESERVE</h1>
          <p className="mt-3 text-[15px] text-silver">Built one cycle at a time.</p>
        </div>
        <div className="flex gap-3">
          <TradeButton size="sm" />
          <ReserveButton size="sm" className="hidden" />
        </div>
      </div>

      {mounted && mode === "live" && sync === "error" ? <StateNotice kind="error" title="CORE DATA UNAVAILABLE" body={error ?? "The RPC did not answer."} onRetry={refreshLive} className="mt-8" /> : null}
      {mounted && mode === "live" && sync === "syncing" ? <StateNotice kind="syncing" title="RESERVE SYNCING" body="Waiting for the latest block." className="mt-8" /> : null}
      {mounted && price?.stale ? <StateNotice kind="stale" title="PRICE FEED DELAYED" body={`Last NVDA print from ${price.sourceLabel}. The reserve value uses it until a fresher source answers.`} className="mt-8" /> : null}

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div>
          <ReserveStage className="aspect-[4/5] w-full max-w-[560px] lg:aspect-square" />
          <p className="label mt-2 text-center">One wafer per completed cycle · hover a wafer or a row · drag to turn</p>
        </div>
        <div className="flex flex-col gap-10">
          <ReserveStats />
          <CurrentCycle />
        </div>
      </div>

      <div className="panel mt-14 p-5 md:p-7">
        <ReserveChart points={series} valuation={valuation} />
      </div>

      <CycleHistory className="mt-16" />
    </div>
  );
}
