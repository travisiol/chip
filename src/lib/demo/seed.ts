import { chipConfig } from "@/config/chip";
import type { ChipState } from "@/types/chip";
import type { Execution } from "@/types/cycle";
import type { ChipTokenInfo, FeeFlow, ReserveState } from "@/types/reserve";
import type { ActivityItem, TradeEvent } from "@/types/transaction";
import { fmtCycle } from "@/lib/format";
import { gaussian, logNormal, mulberry32, type Rng } from "@/lib/chip/prng";

const HOUR = 3_600_000;
const MIN = 60_000;

export interface DemoSeed {
  chip: ChipState;
  reserve: ReserveState;
  executions: Execution[];
  activity: ActivityItem[];
  trades: TradeEvent[];
  token: ChipTokenInfo;
  feeFlow: FeeFlow;
  rng: Rng;
}

/**
 * The opening state of DEMO mode: cycle 29 powering at 84.2 %, 28 completed
 * cycles behind it spread over the last few days, a short feed. Prices are
 * the real ones (passed in); everything else is generated from the seed and
 * carries no transaction hash.
 */
export function buildDemoSeed(now: number, nvdaPrice: number, ethPrice: number, seed = chipConfig.demo.seed): DemoSeed {
  const rng = mulberry32(seed);
  const cfg = chipConfig.demo;
  const target = chipConfig.targetInputUsd;
  const cycles = cfg.startCycle - 1;

  // Walk backwards from the current cycle start: each completed cycle took 1h–4h.
  const cycleStartedAt = now - (2 * HOUR + 11 * MIN);
  const executions: Execution[] = [];
  let t = cycleStartedAt;
  let price = nvdaPrice;
  for (let c = cycles; c >= 1; c--) {
    executions.push({
      id: `demo-cycle-${c}`,
      cycle: c,
      at: t,
      inputUsd: target,
      nvdaAmount: target / price,
      executionPrice: price,
      txHash: null,
      status: "confirmed",
    });
    price = price * (1 - 0.004 * gaussian(rng) - 0.0012);
    t -= (1.3 + rng() * 2.4) * HOUR;
  }
  const balance = executions.reduce((s, p) => s + p.nvdaAmount, 0);
  const reserve: ReserveState = {
    reserveValueUsd: balance * nvdaPrice,
    nvdaTokenBalance: balance,
    totalCycles: cycles,
    totalRouted: cycles * target + cfg.startInputUsd,
    lastExecution: executions[0],
    lastUpdated: now,
  };

  const chip: ChipState = {
    currentInputUsd: cfg.startInputUsd,
    targetInputUsd: target,
    corePowerPercent: (cfg.startInputUsd / target) * 100,
    currentCycle: cfg.startCycle,
    status: "POWERING",
    lastUpdated: now,
    cycleStartedAt,
  };

  // A recent minute of feed: three inputs, one checkpoint, the last execution.
  const trades: TradeEvent[] = [];
  const activity: ActivityItem[] = [];
  for (const ago of [8_000, 17_000, 44_000]) {
    const fee = Math.round(logNormal(rng, 11, 0.7) * 100) / 100;
    const quoteEth = fee / ethPrice / 0.007;
    const at = now - ago;
    trades.push({ id: `demo-trade-${ago}`, side: rng() > 0.4 ? "buy" : "sell", quoteEth, quoteUsd: quoteEth * ethPrice, feeToCoreUsd: fee, trader: null, txHash: null, blockNumber: null, at });
    activity.push({ id: `demo-act-input-${ago}`, kind: "input", title: "CORE INPUT", value: `+$${fee.toFixed(2)}`, at, txHash: null });
  }
  activity.push({ id: "demo-act-checkpoint", kind: "power", title: "CORE POWER", value: `${(chip.corePowerPercent - 1.1).toFixed(1)}% → ${chip.corePowerPercent.toFixed(1)}%`, at: now - 31_000, txHash: null });
  activity.push({ id: "demo-act-execution", kind: "execution", title: `CYCLE ${fmtCycle(cycles)} COMPLETE`, value: `+$${target.toLocaleString("en-US")} NVDA`, at: cycleStartedAt, txHash: null });
  activity.push({ id: "demo-act-cycle", kind: "cycle", title: "NEW CYCLE STARTED", value: fmtCycle(cfg.startCycle), at: cycleStartedAt + 4_000, txHash: null });
  activity.sort((a, b) => b.at - a.at);

  const token: ChipTokenInfo = {
    address: "0x0000000000000000000000000000000000000000",
    name: "CHIP",
    symbol: "CHIP",
    decimals: 18,
    totalSupply: 1_000_000_000,
    curve: null,
    graduated: null,
    priceEth: null,
  };

  // The split a Pons V2 launch implements: 1 % base fee, 70 % of it to the creator (the reserve), no extra tax.
  const feeFlow: FeeFlow = { feeBps: 100, creatorTaxBps: 0, protocolShareBps: 3000, toCoreBps: 70, accruingOnCurveEth: null, claimableEth: null };

  return { chip, reserve, executions, activity, trades, token, feeFlow, rng };
}
