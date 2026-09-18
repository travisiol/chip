import { CHIP_TOKEN, PONS, liveConfigured } from "./contracts";

const num = (raw: string | undefined, fallback: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const chipConfig = {
  site: {
    name: "CHIP",
    tagline: "TRADE. POWER. BUILD NVDA.",
    line: "Every trade powers the chip.",
    url: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://chip.example").replace(/\/$/, ""),
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL?.trim() || "https://x.com/Chip_nvid",
  },
  /** True once a CHIP token and a reserve wallet are configured — LIVE mode becomes available. */
  liveAvailable: liveConfigured,
  /** The core input, in USD, at which an NVDA execution becomes eligible. */
  targetInputUsd: num(process.env.NEXT_PUBLIC_TARGET_INPUT_USD, 1000),
  /** Where TRADE CHIP goes. Defaults to the Pons page of the token; null until a token exists. */
  tradeUrl: process.env.NEXT_PUBLIC_TRADE_URL?.trim() || (CHIP_TOKEN ? `${PONS.appUrl}/launchpad/${CHIP_TOKEN}` : null),
  /** First block worth scanning for reserve inflows. 0 means from genesis (slow) — set it once the reserve exists. */
  reserveStartBlock: BigInt(process.env.NEXT_PUBLIC_RESERVE_START_BLOCK?.trim() || "0"),
  polling: {
    coreMs: 8_000,
    reserveMs: 15_000,
    tradesMs: 6_000,
    priceMs: 45_000,
  },
  /** Reads older than this are shown as STALE. */
  staleAfterMs: 60_000,
  /** How long a fee signal takes to travel from a pin to the core, ms. The input is credited when it lands. */
  signalMs: 950,
  /** DEMO mode: the simulation. Runs on the same store as LIVE. */
  demo: {
    seed: 28,
    /** Cycle in progress when the demo starts. */
    startCycle: 29,
    startInputUsd: 842.1,
    /** Used only if the price layer does not answer. */
    fallbackNvdaPrice: 219.5,
    fallbackEthPrice: 2600,
    /** Milliseconds between simulated trades. */
    tradeGapMs: [2_600, 8_800] as [number, number],
  },
} as const;
