import { formatUnits, type Address, type Hex } from "viem";
import type { TradeEvent } from "@/types/transaction";
import { ponsCurveAbi } from "./abis";
import { publicClient } from "./client";
import { blockTimestamp, knownBlockTimestamp } from "./readReserve";

export interface ActivityScanInput {
  curve: Address;
  fromBlock: bigint;
  toBlock: bigint;
  /** Share of the quote that reaches the core, in bps. */
  toCoreBps: number;
  ethUsd: number | null;
}

/**
 * Trades on the CHIP curve in a block window, with the part of each fee that
 * powered the core. This is what LIVE CORE ACTIVITY is made of.
 */
export async function getCoreActivity(input: ActivityScanInput): Promise<TradeEvent[]> {
  const client = publicClient();
  const [buys, sells] = await Promise.all([
    client.getLogs({ address: input.curve, event: ponsCurveAbi[9], fromBlock: input.fromBlock, toBlock: input.toBlock }),
    client.getLogs({ address: input.curve, event: ponsCurveAbi[10], fromBlock: input.fromBlock, toBlock: input.toBlock }),
  ]);
  const blocks = [...new Set([...buys, ...sells].map((l) => l.blockNumber).filter((b): b is bigint => b != null))];
  await Promise.all(blocks.slice(0, 40).map(blockTimestamp));
  const now = Date.now();
  const toTrade = (side: "buy" | "sell", log: (typeof buys)[number] | (typeof sells)[number]): TradeEvent | null => {
    const args = log.args as { sender?: Hex; quoteIn?: bigint; quoteOut?: bigint };
    const quote = side === "buy" ? args.quoteIn : args.quoteOut;
    if (quote == null || log.blockNumber == null || !log.transactionHash) return null;
    const quoteEth = Number(formatUnits(quote, 18));
    const quoteUsd = input.ethUsd != null ? quoteEth * input.ethUsd : null;
    return {
      id: `${log.transactionHash}-${log.logIndex}`,
      side,
      quoteEth,
      quoteUsd,
      feeToCoreUsd: quoteUsd != null ? (quoteUsd * input.toCoreBps) / 10_000 : 0,
      trader: args.sender ?? null,
      txHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      at: knownBlockTimestamp(log.blockNumber) ?? now,
    };
  };
  const all = [...buys.map((l) => toTrade("buy", l)), ...sells.map((l) => toTrade("sell", l))].filter((t): t is TradeEvent => t !== null);
  return all.sort((a, b) => (a.blockNumber ?? 0) - (b.blockNumber ?? 0));
}
