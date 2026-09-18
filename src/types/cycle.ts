import type { Hex } from "viem";

export type CycleStatus = "active" | "complete" | "pending" | "failed";

/**
 * One power cycle. A completed cycle ended in an NVDA execution; the active
 * one is the chip as it powers. Fields the chain does not state stay null —
 * they are never invented.
 */
export interface Cycle {
  /** 1-based cycle id (#028). */
  id: number;
  /** Epoch ms, when known. */
  startedAt: number | null;
  completedAt: number | null;
  /** USD routed into the core during the cycle (the live input for the active one). */
  inputUsd: number | null;
  /** NVDA Stock Tokens acquired at execution. */
  nvdaAmount: number | null;
  /** USD per NVDA at execution, when known. */
  executionPrice: number | null;
  /** The transaction that moved the NVDA into the reserve. */
  txHash: Hex | null;
  status: CycleStatus;
}

/** One NVDA acquisition by the reserve, as seen on the chain (or simulated in DEMO). */
export interface Execution {
  id: string;
  cycle: number;
  /** Epoch ms. */
  at: number;
  /** USD spent, when decodable; null on the chain. */
  inputUsd: number | null;
  nvdaAmount: number;
  executionPrice: number | null;
  txHash: Hex | null;
  status: "confirmed" | "pending" | "failed";
  blockNumber?: number;
  /** Who sent the NVDA to the reserve (executor or venue). */
  from?: Hex;
}
