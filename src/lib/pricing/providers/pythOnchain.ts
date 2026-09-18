import { PYTH } from "@/config/contracts";
import { pythAbi } from "@/lib/blockchain/abis";
import { publicClient } from "@/lib/blockchain/client";
import type { PriceProvider } from "../types";

/**
 * Pyth's on-chain contract on Robinhood Chain. Reads whatever was last
 * pushed — which can be days old — so the age is always surfaced. Works in
 * the browser as well as on the server; this is the client's last resort.
 */
export const pythOnchainProvider: PriceProvider = {
  id: "pyth-onchain",
  label: "Pyth · on-chain",
  freshForMs: 10 * 60_000,
  supports: (s) => s === "ETH" || s === "NVDA",
  async fetch(symbol) {
    const id = symbol === "ETH" ? PYTH.feeds.ETH : PYTH.feeds.NVDA;
    try {
      const [price, , expo, publishTime] = await publicClient().readContract({ address: PYTH.address, abi: pythAbi, functionName: "getPriceUnsafe", args: [id] });
      return { symbol, price: Number(price) * 10 ** Number(expo), publishedAt: Number(publishTime) * 1000 };
    } catch {
      return null; // PriceFeedNotFound for anything never pushed
    }
  },
};
