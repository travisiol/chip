import type { PriceQuote, PriceSourceId, PriceSymbol } from "@/types/price";

/**
 * A price provider answers for a symbol or returns null. Providers never
 * throw into the UI: the chain tries the next one and the UI shows which
 * source answered, with the age of the print.
 */
export interface PriceProvider {
  id: PriceSourceId;
  label: string;
  /** Prints older than this are flagged stale. */
  freshForMs: number;
  supports: (symbol: PriceSymbol) => boolean;
  fetch: (symbol: PriceSymbol) => Promise<Omit<PriceQuote, "source" | "sourceLabel" | "stale" | "fetchedAt"> | null>;
}

export function finish(provider: PriceProvider, q: Awaited<ReturnType<PriceProvider["fetch"]>>): PriceQuote | null {
  if (!q || !Number.isFinite(q.price) || q.price <= 0) return null;
  const now = Date.now();
  return { ...q, source: provider.id, sourceLabel: provider.label, stale: now - q.publishedAt > provider.freshForMs, fetchedAt: now };
}
