import type { ChipStatus } from "@/types/chip";
import type { Execution } from "@/types/cycle";
import type { ChipStore } from "@/lib/store/chip";
import { fmtAmount, fmtCycle, fmtUsd } from "@/lib/format";

/**
 * The chip state machine.
 *
 *   IDLE ──(data)──▶ POWERING ──(input ≥ target)──▶ FULL ──(execution started)──▶ EXECUTING
 *   EXECUTING ──(tx confirmed)──▶ CONFIRMED ──▶ RESETTING ──▶ POWERING (next cycle)
 *
 * FULL waits for the configured executor (the site never buys anything
 * itself); in LIVE mode a new NVDA inflow to the reserve wallet is what moves
 * the machine on to CONFIRMED. EXECUTING is only shown when a pending
 * execution is actually known (or in DEMO, where it is simulated).
 */

export type ChipEvent = "data_ready" | "power_reached" | "power_dropped" | "execution_started" | "execution_confirmed" | "execution_failed" | "reset_started" | "reset_done" | "data_lost";

export function nextStatus(status: ChipStatus, event: ChipEvent): ChipStatus {
  if (event === "data_lost") return "IDLE";
  switch (status) {
    case "IDLE":
      return event === "data_ready" ? "POWERING" : status;
    case "POWERING":
      return event === "power_reached" ? "FULL" : status;
    case "FULL":
      if (event === "execution_started") return "EXECUTING";
      if (event === "execution_confirmed") return "CONFIRMED";
      if (event === "power_dropped") return "POWERING";
      return status;
    case "EXECUTING":
      if (event === "execution_confirmed") return "CONFIRMED";
      if (event === "execution_failed") return "FULL";
      return status;
    case "CONFIRMED":
      return event === "reset_started" ? "RESETTING" : status;
    case "RESETTING":
      return event === "reset_done" ? "POWERING" : status;
  }
}

/** What each status says on screen. Text always accompanies colour. */
export const STATUS_LABEL: Record<ChipStatus, string> = {
  IDLE: "CORE IDLE",
  POWERING: "POWERING",
  FULL: "CORE FULL",
  EXECUTING: "EXECUTING NVDA",
  CONFIRMED: "RESERVE UPDATED",
  RESETTING: "NEW CYCLE",
};

/** Timeline of the signature moment, in milliseconds. Slow enough to feel expensive, fast enough to stay responsive. */
export const SEQUENCE = {
  /** CORE FULL — every path lit, a clean white-green pulse. */
  fullMs: 900,
  /** EXECUTING NVDA PURCHASE with the progress line (only when an execution is actually known/simulated). */
  executingMs: 1_900,
  /** +$1,000 NVDA — the reserve counts up, the execution leaves through the output bus. */
  confirmedMs: 1_700,
  /** The chip powers down to 0 %. */
  resettingMs: 1_500,
} as const;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(new Error("aborted"))), { once: true });
  });

let current: AbortController | null = null;

export const isSequenceRunning = () => current !== null;

type SequenceStore = Pick<ChipStore, "setStatus" | "flash" | "pushActivity" | "addExecution" | "setReserve" | "setChip" | "chip" | "reserve">;

/**
 * Plays the cycle end on the store: FULL → EXECUTING → CONFIRMED → RESETTING →
 * POWERING. `execution` is what happened (on the chain, or in the simulation).
 * Resolves when the next cycle has started.
 */
export async function runExecutionSequence(store: SequenceStore, execution: Execution, opts: { skipExecuting?: boolean; nextCycleStartsAt?: number } = {}): Promise<void> {
  current?.abort();
  const ctrl = new AbortController();
  current = ctrl;
  const { signal } = ctrl;
  try {
    store.setStatus("FULL");
    store.flash();
    store.pushActivity({ kind: "power", title: "CORE FULL", value: "100%" });
    await sleep(SEQUENCE.fullMs, signal);

    if (!opts.skipExecuting) {
      store.setStatus("EXECUTING");
      store.pushActivity({ kind: "execution", title: "EXECUTING", value: "NVDA STOCK TOKEN PURCHASE" });
      await sleep(SEQUENCE.executingMs, signal);
    }

    store.setStatus("CONFIRMED");
    store.addExecution(execution);
    const value = execution.inputUsd != null ? `+${fmtUsd(execution.inputUsd, 0)} NVDA` : `+${fmtAmount(execution.nvdaAmount, 4)} NVDA`;
    store.pushActivity({ kind: "execution", title: `CYCLE ${fmtCycle(execution.cycle)} COMPLETE`, value, txHash: execution.txHash, at: execution.at });
    await sleep(SEQUENCE.confirmedMs, signal);

    store.setStatus("RESETTING");
    store.setChip({ currentInputUsd: 0 });
    await sleep(SEQUENCE.resettingMs, signal);

    const startedAt = opts.nextCycleStartsAt ?? Date.now();
    store.setChip({ currentCycle: execution.cycle + 1, cycleStartedAt: startedAt, lastUpdated: startedAt });
    store.setStatus("POWERING");
    store.pushActivity({ kind: "cycle", title: "NEW CYCLE STARTED", value: fmtCycle(execution.cycle + 1), at: startedAt });
  } catch (e) {
    if ((e as Error).message !== "aborted") throw e;
  } finally {
    if (current === ctrl) current = null;
  }
}

export function cancelSequence() {
  current?.abort();
  current = null;
}
