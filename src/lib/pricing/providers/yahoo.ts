import type { PriceProvider } from "../types";

/**
 * Yahoo Finance chart endpoint — keyless, ~15 minutes delayed, needs a
 * User-Agent and does not allow browser CORS. Server only. The last regular
 * market print carries its own timestamp so the age shown is honest.
 */
const TICKERS = { NVDA: "NVDA", ETH: "ETH-USD" } as const;

interface YahooChart {
  chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketTime?: number } }>; error?: unknown };
}

export const yahooProvider: PriceProvider = {
  id: "yahoo",
  label: "Yahoo Finance · delayed",
  freshForMs: 24 * 3_600_000,
  supports: (s) => s in TICKERS,
  async fetch(symbol) {
    const ticker = TICKERS[symbol];
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=15m&includePrePost=false`, {
      headers: { "User-Agent": "Mozilla/5.0 (CHIP reserve monitor)" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChart;
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice || !meta.regularMarketTime) return null;
    return { symbol, price: meta.regularMarketPrice, publishedAt: meta.regularMarketTime * 1000 };
  },
};
