/**
 * Where the chip is in its cycle.
 *
 *   IDLE → POWERING → FULL → EXECUTING → CONFIRMED → RESETTING → POWERING …
 *
 * IDLE is the state before any data (or while data is unavailable);
 * POWERING is the resting state of a running system.
 */
export type ChipStatus = "IDLE" | "POWERING" | "FULL" | "EXECUTING" | "CONFIRMED" | "RESETTING";

/** Data health, independent of the cycle status. */
export type SyncStatus = "unconfigured" | "syncing" | "ok" | "stale" | "error";

/** Where the figures come from. The two never mix. */
export type ChipMode = "demo" | "live";

export interface ChipState {
  /** 0–100, clamped. */
  corePowerPercent: number;
  /** Fees routed to the core and not yet converted, in USD. */
  currentInputUsd: number;
  /** The input at which an NVDA execution becomes eligible, in USD. */
  targetInputUsd: number;
  /** 1-based id of the cycle currently powering. */
  currentCycle: number;
  status: ChipStatus;
  /** Epoch ms of the last successful read. */
  lastUpdated: number;
  /** Epoch ms when the current cycle started, when known. */
  cycleStartedAt: number | null;
  /** The input in ETH before conversion (LIVE only). */
  inputEth?: number;
}

/** A fee entering the chip: it becomes a signal on one pin, travels to the core, then counts. */
export interface FeeEvent {
  id: string;
  amountUsd: number;
  /** Epoch ms the signal entered the pin. */
  at: number;
  /** Which trace it rides (index into the trace network). */
  pin: number;
  /** True once the signal reached the core and the input was credited. */
  landed: boolean;
}
