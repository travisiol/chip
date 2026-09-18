import type { PriceBook, PriceQuote, PriceSymbol } from "@/types/price";
import { hermesProvider } from "./providers/hermes";
import { pythOnchainProvider } from "./providers/pythOnchain";
import { yahooProvider } from "./providers/yahoo";
import { finish, type PriceProvider } from "./types";

/**
 * Server-side provider chain, best source first. The first provider that
 * answers wins; a stale answer is still returned (flagged) rather than
 * nothing, because a stale reserve valuation with its age is more honest
 * than a blank.
 */
const SERVER_CHAIN: PriceProvider[] = [hermesProvider, yahooProvider, pythOnchainProvider];

const cache = new Map<PriceSymbol, PriceQuote>();
const CACHE_MS = 45_000;

async function fromChain(symbol: PriceSymbol, chain: PriceProvider[]): Promise<PriceQuote | null> {
  let fallback: PriceQuote | null = null;
  for (const p of chain) {
    if (!p.supports(symbol)) continue;
    try {
      const q = finish(p, await p.fetch(symbol));
      if (!q) continue;
      if (!q.stale) return q;
      fallback ??= q;
    } catch {
      continue;
    }
  }
  return fallback;
}

/** NVDA Stock Token reference price, in USD. */
export const getNVDAReferencePrice = () => getPrice("NVDA");

export const getEthPrice = () => getPrice("ETH");

export async function getPrice(symbol: PriceSymbol): Promise<PriceQuote | null> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) return hit;
  const q = await fromChain(symbol, SERVER_CHAIN);
  if (q) cache.set(symbol, q);
  return q ?? hit ?? null;
}

export async function getPrices(symbols: PriceSymbol[]): Promise<PriceBook> {
  const entries = await Promise.all(symbols.map(async (s) => [s, await getPrice(s)] as const));
  const book: PriceBook = {};
  for (const [s, q] of entries) if (q) book[s] = q;
  return book;
}

/** The chain the browser can run on its own when no server is available: on-chain Pyth only. */
export const CLIENT_CHAIN: PriceProvider[] = [pythOnchainProvider];
export { fromChain };
