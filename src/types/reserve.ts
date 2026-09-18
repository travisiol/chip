import type { Hex } from "viem";
import type { Execution } from "./cycle";

export interface ReserveState {
  /** Balance × NVDA reference price. Null when no price source answers. */
  reserveValueUsd: number | null;
  nvdaTokenBalance: number;
  totalCycles: number;
  /** Everything ever routed into the core, in USD, when the history allows the sum. */
  totalRouted: number | null;
  lastExecution: Execution | null;
  lastUpdated: number;
}

/** Facts about the CHIP token itself, read from its contract and bonding curve. */
export interface ChipTokenInfo {
  address: Hex;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  /** Pons V2 curve, when the token was launched there. */
  curve: Hex | null;
  graduated: boolean | null;
  /** Spot price in ETH per CHIP from the curve reserves, when available. */
  priceEth: number | null;
}

/** How a trade's fee is split, as implemented by the venue. Basis points of the trade's quote amount. */
export interface FeeFlow {
  /** Base venue fee on every trade. */
  feeBps: number;
  /** Extra creator tax configured at launch. */
  creatorTaxBps: number;
  /** Share of the base fee kept by the venue's protocol. */
  protocolShareBps: number;
  /** What reaches the core per unit traded, in bps of the quote. */
  toCoreBps: number;
  /** Fees accrued on the curve, not yet swept, in ETH. */
  accruingOnCurveEth: number | null;
  /** Fees swept to escrow and claimable by the reserve, in ETH. */
  claimableEth: number | null;
}
