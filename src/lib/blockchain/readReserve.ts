import { formatUnits, type Address } from "viem";
import { NVDA_TOKEN } from "@/config/contracts";
import { erc20Abi } from "./abis";
import { publicClient } from "./client";

export interface ReserveBalance {
  nvdaTokenBalance: number;
  decimals: number;
  symbol: string;
  name: string;
}

/** NVDA Stock Token balance of the reserve wallet, with the token's own metadata. */
export async function getReserveBalance(reserveWallet: Address, token: Address = NVDA_TOKEN): Promise<ReserveBalance> {
  const client = publicClient();
  const [raw, decimals, symbol, name] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [reserveWallet] }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "name" }),
  ]);
  return { nvdaTokenBalance: Number(formatUnits(raw, decimals)), decimals, symbol, name };
}

/** Block timestamps never change: one fetch per block, ever. */
const blockStamps = new Map<bigint, number>();
export async function blockTimestamp(bn: bigint): Promise<number> {
  const hit = blockStamps.get(bn);
  if (hit) return hit;
  const b = await publicClient().getBlock({ blockNumber: bn });
  const ms = Number(b.timestamp) * 1000;
  blockStamps.set(bn, ms);
  return ms;
}

export const knownBlockTimestamp = (bn: bigint) => blockStamps.get(bn);
