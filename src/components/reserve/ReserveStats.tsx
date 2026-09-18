"use client";

import { DemoChip } from "@/components/ui/DemoChip";
import { Label } from "@/components/ui/Label";
import { Num } from "@/components/ui/Num";
import { fmtAgo, fmtAmount, fmtInt, fmtUsd } from "@/lib/format";
import { useMounted, useNow } from "@/lib/hooks";
import { useChip } from "@/lib/store/chip";

/** NVDA RESERVE · TOTAL CYCLES · TOTAL ROUTED · LAST EXECUTION — the reserve in four figures. */
export function ReserveStats({ compact = false }: { compact?: boolean }) {
  const mounted = useMounted();
  const reserve = useChip((s) => s.reserve);
  const price = useChip((s) => s.prices.NVDA);
  const now = useNow();
  const ready = mounted && reserve.lastUpdated > 0;
  const big = compact ? "text-[clamp(28px,3vw,40px)]" : "text-[clamp(34px,4vw,56px)]";
  const mid = compact ? "text-[clamp(22px,2.4vw,30px)]" : "text-[clamp(26px,3vw,40px)]";

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-8">
      <div className="col-span-2">
        <Label className="flex items-center gap-2">
          NVDA reserve <DemoChip />
        </Label>
        <dd className={`num mt-2 leading-none text-ink ${big}`}>{ready && reserve.reserveValueUsd != null ? <Num value={reserve.reserveValueUsd} format={(v) => fmtUsd(v, 2)} rate={4} /> : "—"}</dd>
        <div className="mono mt-2 text-[12px] text-silver">
          {ready ? <Num value={reserve.nvdaTokenBalance} format={(v) => fmtAmount(v, 2)} rate={4} /> : "—"} NVDA
          {price ? <span className="text-muted"> · {fmtUsd(price.price, 2)} / NVDA{price.stale ? " · delayed" : ""}</span> : null}
        </div>
      </div>
      <div>
        <Label>Total cycles</Label>
        <dd className={`num mt-2 leading-none text-ink ${mid}`}>{mounted ? fmtInt(reserve.totalCycles) : "—"}</dd>
      </div>
      <div>
        <Label>Total routed</Label>
        <dd className={`num mt-2 leading-none text-ink ${mid}`}>{ready && reserve.totalRouted != null ? <Num value={reserve.totalRouted} format={(v) => fmtUsd(v, 0)} rate={4} /> : "—"}</dd>
      </div>
      <div>
        <Label>Last execution</Label>
        <dd className={`num mt-2 leading-none text-ink ${mid}`}>{mounted && reserve.lastExecution && now ? fmtAgo(reserve.lastExecution.at, now) : "—"}</dd>
      </div>
    </dl>
  );
}
