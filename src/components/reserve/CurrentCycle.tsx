"use client";

import { DemoChip } from "@/components/ui/DemoChip";
import { Label } from "@/components/ui/Label";
import { Num } from "@/components/ui/Num";
import { STATUS_LABEL } from "@/lib/chip/machine";
import { fmtCycle, fmtDuration, fmtPct, fmtUsd } from "@/lib/format";
import { useMounted, useNow } from "@/lib/hooks";
import { deriveCycles, deriveMetrics } from "@/lib/reserve/cycles";
import { remainingUsd, useChip } from "@/lib/store/chip";

/**
 * ACTIVE CYCLE #029 — core power, input accumulated, remaining, started,
 * average cycle time. Alive: the figures glide, the timer ticks, the level
 * bar is the same trace language as the rest of the page.
 */
export function CurrentCycle({ className = "" }: { className?: string }) {
  const mounted = useMounted();
  const chip = useChip((s) => s.chip);
  const executions = useChip((s) => s.executions);
  const now = useNow();
  const metrics = deriveMetrics(deriveCycles(executions, chip), now);
  const remaining = remainingUsd(chip);
  const powering = chip.status === "POWERING";
  const sync = useChip((s) => s.sync);
  const ready = mounted && chip.lastUpdated > 0 && sync !== "syncing";

  return (
    <div className={`panel p-6 md:p-7 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="flex items-center gap-2">
            Active cycle <DemoChip />
          </Label>
          <div className="num mt-2 text-[clamp(40px,5vw,64px)] leading-none text-ink">{ready ? fmtCycle(chip.currentCycle) : "—"}</div>
        </div>
        <div className="text-right">
          <Label>Core power</Label>
          <div className="num mt-2 text-[clamp(28px,3.2vw,40px)] leading-none text-energy">{ready ? <Num value={chip.corePowerPercent} format={(v) => fmtPct(v, 1)} /> : "—"}</div>
          <div className="label mt-1 flex items-center justify-end gap-2">
            <span className={`dot ${powering || chip.status === "FULL" ? "dot-live" : ""} ${powering ? "animate-power-pulse" : ""}`} />
            {mounted ? STATUS_LABEL[chip.status] : "—"}
          </div>
        </div>
      </div>

      {/* The level: a trace that fills, with the target tick at the end. */}
      <div className="relative mt-6 h-[6px] w-full overflow-hidden rounded-sm bg-graphite" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(chip.corePowerPercent)} aria-label="Core power">
        <div className="absolute inset-y-0 left-0 bg-energy transition-[width] duration-700 ease-out" style={{ width: `${ready ? chip.corePowerPercent : 0}%`, boxShadow: "0 0 12px rgba(183,255,57,0.6)" }} />
        <div className="absolute inset-y-0 right-0 w-px bg-aluminum/60" />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <div>
          <Label>Input accumulated</Label>
          <dd className="num mt-1.5 text-[20px] text-ink">{ready ? <Num value={chip.currentInputUsd} format={(v) => fmtUsd(v, 2)} /> : "—"}</dd>
        </div>
        <div>
          <Label>Remaining</Label>
          <dd className="num mt-1.5 text-[20px] text-ink">{ready ? <Num value={remaining} format={(v) => fmtUsd(v, 2)} /> : "—"}</dd>
        </div>
        <div>
          <Label>Started</Label>
          <dd className="num mt-1.5 text-[20px] text-ink">{mounted && metrics.activeCycleMs != null ? `${fmtDuration(metrics.activeCycleMs)} ago` : "—"}</dd>
        </div>
        <div>
          <Label>Avg cycle time</Label>
          <dd className="num mt-1.5 text-[20px] text-ink">{mounted && metrics.avgCycleMs != null ? fmtDuration(metrics.avgCycleMs) : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
