import type { ChipState } from "@/types/chip";
import type { Cycle, Execution } from "@/types/cycle";

/**
 * Cycles are derived, never stored: every execution closes one, the chip is
 * the open one. Completed cycles start where the previous execution landed.
 */
export function deriveCycles(executions: Execution[], chip: ChipState): Cycle[] {
  const chronological = [...executions].sort((a, b) => a.at - b.at);
  const completed: Cycle[] = chronological.map((e, i) => ({
    id: e.cycle,
    status: e.status === "confirmed" ? "complete" : e.status,
    startedAt: i > 0 ? chronological[i - 1].at : null,
    completedAt: e.at,
    inputUsd: e.inputUsd,
    nvdaAmount: e.nvdaAmount,
    executionPrice: e.executionPrice,
    txHash: e.txHash,
  }));
  const active: Cycle = {
    id: chip.currentCycle,
    status: "active",
    startedAt: chip.cycleStartedAt,
    completedAt: null,
    inputUsd: chip.currentInputUsd,
    nvdaAmount: null,
    executionPrice: null,
    txHash: null,
  };
  return [active, ...completed.reverse()];
}

export interface CycleMetrics {
  /** Duration of the cycle in progress, ms, or null when its start is unknown. */
  activeCycleMs: number | null;
  /** Mean duration of completed cycles with a known start, ms. */
  avgCycleMs: number | null;
  lastExecutionAt: number | null;
  sampleSize: number;
}

export function deriveMetrics(cycles: Cycle[], now: number): CycleMetrics {
  const active = cycles.find((c) => c.status === "active");
  const done = cycles.filter((c) => c.status === "complete" && c.startedAt != null && c.completedAt != null);
  const durations = done.map((c) => (c.completedAt as number) - (c.startedAt as number)).filter((d) => d > 0);
  const last = cycles.filter((c) => c.status === "complete").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
  return {
    activeCycleMs: active?.startedAt != null && now > 0 ? Math.max(0, now - active.startedAt) : null,
    avgCycleMs: durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : null,
    lastExecutionAt: last?.completedAt ?? null,
    sampleSize: durations.length,
  };
}

/** Reserve history for the chart: cumulative NVDA after each execution, valued at the execution price when known, else at `markPrice`. */
export function reserveSeries(executions: Execution[], markPrice: number | null): Array<{ at: number; nvda: number; usd: number | null; cycle: number }> {
  const chronological = [...executions].sort((a, b) => a.at - b.at);
  let nvda = 0;
  return chronological.map((e) => {
    nvda += e.nvdaAmount;
    const price = e.executionPrice ?? markPrice;
    return { at: e.at, nvda, usd: price != null ? nvda * price : null, cycle: e.cycle };
  });
}

/** Sum of what is known to have been routed: completed cycles with a USD figure, plus the live input. */
export function totalRoutedUsd(executions: Execution[], chip: ChipState): number | null {
  const known = executions.filter((e) => e.inputUsd != null);
  if (executions.length > 0 && known.length === 0) return null;
  return known.reduce((s, e) => s + (e.inputUsd as number), 0) + chip.currentInputUsd;
}
