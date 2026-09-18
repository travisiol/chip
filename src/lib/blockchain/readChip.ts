import { formatEther, formatUnits, type Address } from "viem";
import { PONS } from "@/config/contracts";
import type { ChipState } from "@/types/chip";
import type { ChipTokenInfo, FeeFlow } from "@/types/reserve";
import { erc20Abi, ponsCurveAbi, ponsEscrowAbi, ponsTokenAbi } from "./abis";
import { publicClient } from "./client";

/**
 * Facts about the CHIP token: ERC-20 metadata plus, when it is a Pons V2
 * launch, its curve and the spot price the curve implies.
 */
export async function getChipTokenInfo(token: Address): Promise<ChipTokenInfo> {
  const client = publicClient();
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: "name" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "totalSupply" }),
  ]);

  let curve: Address | null = null;
  try {
    const c = await client.readContract({ address: token, abi: ponsTokenAbi, functionName: "curve" });
    if (c && !/^0x0{40}$/i.test(c)) curve = c;
  } catch {
    curve = null; // a plain ERC-20 has no curve()
  }

  let graduated: boolean | null = null;
  let priceEth: number | null = null;
  if (curve) {
    try {
      const [g, reserves] = await Promise.all([
        client.readContract({ address: curve, abi: ponsCurveAbi, functionName: "graduated" }),
        client.readContract({ address: curve, abi: ponsCurveAbi, functionName: "getReserves" }),
      ]);
      graduated = g;
      const [quote, tokens] = reserves;
      if (tokens > 0n) priceEth = Number(formatUnits(quote, 18)) / Number(formatUnits(tokens, decimals));
    } catch {
      graduated = null;
    }
  }

  return { address: token, name, symbol, decimals, totalSupply: Number(formatUnits(totalSupply, decimals)), curve, graduated, priceEth };
}

/**
 * How trades are taxed and where the money is right now, straight from the
 * curve. `toCoreBps` is the share of every trade that reaches the core: the
 * creator's cut of the base fee plus the creator tax, if any.
 */
export async function getFeeFlow(curve: Address, reserveWallet: Address | null): Promise<FeeFlow> {
  const client = publicClient();
  const [feeBps, creatorTaxBps, protocolShareBps, quoteFeeBalance] = await Promise.all([
    client.readContract({ address: curve, abi: ponsCurveAbi, functionName: "feeBps" }),
    client.readContract({ address: curve, abi: ponsCurveAbi, functionName: "creatorTaxBps" }),
    client.readContract({ address: curve, abi: ponsCurveAbi, functionName: "protocolFeeShareBps" }),
    client.readContract({ address: curve, abi: ponsCurveAbi, functionName: "quoteFeeBalance" }),
  ]);
  let claimableEth: number | null = null;
  if (reserveWallet) {
    try {
      const c = await client.readContract({ address: PONS.feeEscrow, abi: ponsEscrowAbi, functionName: "balanceOf", args: [reserveWallet] });
      claimableEth = Number(formatEther(c));
    } catch {
      claimableEth = null;
    }
  }
  const fee = Number(feeBps);
  const protocol = Number(protocolShareBps);
  const tax = Number(creatorTaxBps);
  return {
    feeBps: fee,
    creatorTaxBps: tax,
    protocolShareBps: protocol,
    toCoreBps: Math.round((fee * (10_000 - protocol)) / 10_000 + tax),
    accruingOnCurveEth: Number(formatEther(quoteFeeBalance)),
    claimableEth,
  };
}

export interface CorePowerInput {
  reserveWallet: Address;
  /** The CHIP curve; its unswept fees are counted at the creator's share. */
  curve: Address | null;
  /** Creator's share of the curve's base fee, in bps (10 000 − protocolFeeShareBps). */
  creatorShareBps: number;
  /** USD per ETH — from the price layer, never hardcoded. Null leaves the USD input at 0; the caller flags it. */
  ethUsd: number | null;
  targetInputUsd: number;
  /** Derived from the execution history: completed cycles + 1. */
  currentCycle: number;
  cycleStartedAt: number | null;
}

export interface CoreBreakdown {
  walletEth: number;
  escrowEth: number;
  curveEth: number;
}

/**
 * The core input is everything routed to the reserve and not yet converted:
 * ETH sitting in the reserve wallet, ETH swept to the venue's escrow for it,
 * and the creator's share of fees still accruing on the curve — valued at
 * the current ETH price. Nothing else counts.
 */
export async function getCorePower(input: CorePowerInput): Promise<{ state: Omit<ChipState, "status">; breakdown: CoreBreakdown }> {
  const client = publicClient();
  const [balance, claimable, accrued] = await Promise.all([
    client.getBalance({ address: input.reserveWallet }),
    client.readContract({ address: PONS.feeEscrow, abi: ponsEscrowAbi, functionName: "balanceOf", args: [input.reserveWallet] }).catch(() => 0n),
    input.curve ? client.readContract({ address: input.curve, abi: ponsCurveAbi, functionName: "quoteFeeBalance" }).catch(() => 0n) : Promise.resolve(0n),
  ]);
  const walletEth = Number(formatEther(balance));
  const escrowEth = Number(formatEther(claimable));
  const curveEth = (Number(formatEther(accrued)) * input.creatorShareBps) / 10_000;
  const inputEth = walletEth + escrowEth + curveEth;
  const currentInputUsd = input.ethUsd != null ? inputEth * input.ethUsd : 0;
  return {
    state: {
      currentInputUsd,
      targetInputUsd: input.targetInputUsd,
      corePowerPercent: input.targetInputUsd > 0 ? Math.min(100, Math.max(0, (currentInputUsd / input.targetInputUsd) * 100)) : 0,
      currentCycle: input.currentCycle,
      lastUpdated: Date.now(),
      cycleStartedAt: input.cycleStartedAt,
      inputEth,
    },
    breakdown: { walletEth, escrowEth, curveEth },
  };
}

/** `getChipState` is `getCorePower` with the status left to the machine — the chain has no notion of it. */
export const getChipState = getCorePower;
