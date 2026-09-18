import { formatUnits, type Address, type Hex } from "viem";
import { NVDA_TOKEN } from "@/config/contracts";
import type { Execution } from "@/types/cycle";
import { erc20Abi } from "./abis";
import { publicClient } from "./client";
import { blockTimestamp, knownBlockTimestamp } from "./readReserve";

/** The RPC times out on wide scans of a busy token (3M blocks → "log query timed out"); 400k answers. Shrinks further on refusal. */
const CHUNK = 400_000n;

async function* transfersTo(token: Address, to: Address, fromBlock: bigint, toBlock: bigint) {
  const client = publicClient();
  let start = fromBlock;
  let span = CHUNK;
  while (start <= toBlock) {
    const end = start + span - 1n > toBlock ? toBlock : start + span - 1n;
    try {
      const logs = await client.getLogs({ address: token, event: erc20Abi[5], args: { to }, fromBlock: start, toBlock: end });
      yield* logs;
      start = end + 1n;
    } catch (e) {
      if (span <= 25_000n) throw e;
      span /= 4n;
    }
  }
}

export interface CycleScan {
  executions: Execution[];
  /** The head block the scan covered — pass it back as `fromBlock + 1` next time. */
  toBlock: bigint;
}

/**
 * Every NVDA inflow to the reserve wallet is an execution that closed a
 * cycle. Decoded from Transfer logs; timestamps from the blocks. USD and
 * price are left null — the chain does not say what was paid, and we never
 * guess. Incremental: `cycleOffset` numbers executions after the ones
 * already known.
 */
export async function getCycleHistory(reserveWallet: Address, fromBlock: bigint, token: Address = NVDA_TOKEN, cycleOffset = 0): Promise<CycleScan> {
  const client = publicClient();
  const toBlock = await client.getBlockNumber();
  if (fromBlock > toBlock) return { executions: [], toBlock };
  const decimals = await client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" });
  const logs: Array<{ txHash: Hex; blockNumber: bigint; logIndex: number; from: Hex; value: bigint }> = [];
  for await (const log of transfersTo(token, reserveWallet, fromBlock, toBlock)) {
    if (!log.args.from || log.args.value == null || !log.transactionHash || log.blockNumber == null) continue;
    logs.push({ txHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.logIndex ?? 0, from: log.args.from, value: log.args.value });
  }
  logs.sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1));

  const blocks = [...new Set(logs.map((l) => l.blockNumber))];
  for (let i = 0; i < blocks.length; i += 6) await Promise.all(blocks.slice(i, i + 6).map(blockTimestamp));

  const executions = logs.map((l, i) => ({
    id: `${l.txHash}-${l.logIndex}`,
    cycle: cycleOffset + i + 1,
    at: knownBlockTimestamp(l.blockNumber) ?? 0,
    inputUsd: null,
    nvdaAmount: Number(formatUnits(l.value, decimals)),
    executionPrice: null,
    txHash: l.txHash,
    status: "confirmed" as const,
    blockNumber: Number(l.blockNumber),
    from: l.from,
  }));
  return { executions, toBlock };
}

/** The current cycle is derived: completed executions + 1, started when the last one landed. */
export function getCurrentCycle(executions: Execution[]): { id: number; startedAt: number | null } {
  const last = [...executions].sort((a, b) => b.at - a.at)[0] ?? null;
  return { id: executions.length + 1, startedAt: last?.at ?? null };
}
