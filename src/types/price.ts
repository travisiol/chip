export type PriceSymbol = "NVDA" | "ETH";

export type PriceSourceId = "pyth-hermes" | "pyth-onchain" | "yahoo";

export interface PriceQuote {
  symbol: PriceSymbol;
  /** USD. */
  price: number;
  /** Epoch ms of the print. */
  publishedAt: number;
  source: PriceSourceId;
  sourceLabel: string;
  /** True when the print is older than the source's freshness budget. */
  stale: boolean;
  /** Epoch ms when we fetched it. */
  fetchedAt: number;
}

export type PriceBook = Partial<Record<PriceSymbol, PriceQuote>>;
