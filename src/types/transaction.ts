import type { Hex } from "viem";

export type ActivityKind = "input" | "power" | "execution" | "cycle" | "system";

/** One row of LIVE CORE ACTIVITY. */
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Short uppercase headline, e.g. "CORE INPUT". */
  title: string;
  /** The figure, e.g. "+$12.81". */
  value: string;
  /** Epoch ms. */
  at: number;
  txHash?: Hex | null;
}

/** A trade on the CHIP curve, with the part of its fee that powered the core. */
export interface TradeEvent {
  id: string;
  side: "buy" | "sell";
  /** Quote (ETH) that moved. */
  quoteEth: number;
  quoteUsd: number | null;
  /** The part of the fee that reached the core, in USD. */
  feeToCoreUsd: number;
  trader: Hex | null;
  txHash: Hex | null;
  blockNumber: number | null;
  at: number;
}
