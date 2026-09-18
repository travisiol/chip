import type { PriceBook, PriceSymbol } from "@/types/price";
import { CLIENT_CHAIN, fromChain } from "./index";

/**
 * Browser side: ask our own /api/price (which holds the keys and the
 * server-only providers); if the route is unreachable — a static deploy, an
 * offline dev box — read Pyth on-chain directly and say so.
 */
export async function fetchPrices(symbols: PriceSymbol[]): Promise<PriceBook> {
  try {
    const res = await fetch(`/api/price?symbols=${symbols.join(",")}`, { cache: "no-store", signal: AbortSignal.timeout(9_000) });
    if (res.ok) {
      const json = (await res.json()) as { quotes: PriceBook };
      if (json.quotes && Object.keys(json.quotes).length > 0) return json.quotes;
    }
  } catch {
    // fall through to on-chain
  }
  const book: PriceBook = {};
  for (const s of symbols) {
    const q = await fromChain(s, CLIENT_CHAIN);
    if (q) book[s] = q;
  }
  return book;
}
