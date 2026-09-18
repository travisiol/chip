import { PYTH } from "@/config/contracts";
import type { PriceProvider } from "../types";

/**
 * Pyth Hermes — sub-second prices, but the public endpoint has required an
 * API key since 2026-08-26. Server only; the key never reaches the browser.
 */
const HERMES_URL = (process.env.PYTH_HERMES_URL?.trim() || "https://hermes.pyth.network").replace(/\/$/, "");
const key = () => process.env.PYTH_API_KEY?.trim() || "";

export const hasHermesKey = () => Boolean(key());

interface HermesResponse {
  parsed?: Array<{ id: string; price: { price: string; expo: number; publish_time: number } }>;
}

export const hermesProvider: PriceProvider = {
  id: "pyth-hermes",
  label: "Pyth · Hermes",
  freshForMs: 2 * 60_000,
  supports: (s) => s === "ETH" || s === "NVDA",
  async fetch(symbol) {
    if (!key()) return null;
    const id = symbol === "ETH" ? PYTH.feeds.ETH : PYTH.feeds.NVDA;
    const res = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}&parsed=true`, {
      headers: { Authorization: `Bearer ${key()}` },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as HermesResponse;
    const p = json.parsed?.[0]?.price;
    if (!p) return null;
    return { symbol, price: Number(p.price) * 10 ** p.expo, publishedAt: p.publish_time * 1000 };
  },
};
