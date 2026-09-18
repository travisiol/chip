// Runs every read the site makes against Robinhood Chain, on real addresses, and
// checks the invariants LIVE mode relies on. Node side (direct RPC), no browser.
//
//   npm run live-check                       → finds a real NVDA receiver as the reserve fixture
//   CHIP_TOKEN=0x… RESERVE_WALLET=0x… npm run live-check
//
// Fixtures: an active Pons V2 token (its curve trades every few minutes) stands in
// for CHIP; the reserve fixture is whichever address received the NVDA Stock Token
// most often in the last 20k blocks — a real reserve would look exactly like it.
import assert from "node:assert/strict";
import type { Address } from "viem";
import { NVDA_TOKEN } from "@/config/contracts";
import { getChipTokenInfo, getCoreActivity, getCorePower, getCycleHistory, getFeeFlow, getReserveBalance, publicClient } from "@/lib/blockchain";
import { erc20Abi } from "@/lib/blockchain/abis";
import { getPrices } from "@/lib/pricing";
import { pythOnchainProvider } from "@/lib/pricing/providers/pythOnchain";
import { finish } from "@/lib/pricing/types";
import { deriveCycles, deriveMetrics } from "@/lib/reserve/cycles";
import { emptyChip } from "@/lib/store/chip";

const CHIP = (process.env.CHIP_TOKEN ?? "0x5Fa6Aad2863B6Cb92882cb491D5602C1C0BdE373") as Address;

const line = (k: string, v: unknown) => console.log(`${k.padEnd(28)} ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
const t0 = Date.now();

const client = publicClient();
const head = await client.getBlockNumber();
line("head block", head);

// 1. Prices — the server chain, then the on-chain last resort with its age.
const prices = await getPrices(["NVDA", "ETH"]);
assert.ok(prices.NVDA && prices.NVDA.price > 20 && prices.NVDA.price < 5000, "NVDA price in a sane range");
assert.ok(prices.ETH && prices.ETH.price > 100 && prices.ETH.price < 50_000, "ETH price in a sane range");
line("NVDA price", `${prices.NVDA.price} via ${prices.NVDA.source} stale=${prices.NVDA.stale}`);
line("ETH price", `${prices.ETH.price} via ${prices.ETH.source} stale=${prices.ETH.stale}`);
const onchainEth = finish(pythOnchainProvider, await pythOnchainProvider.fetch("ETH"));
line("Pyth on-chain ETH", onchainEth ? `${onchainEth.price} published ${new Date(onchainEth.publishedAt).toISOString()} stale=${onchainEth.stale}` : "none");
assert.ok(onchainEth === null || onchainEth.stale || Date.now() - onchainEth.publishedAt < 10 * 60_000, "an on-chain Pyth print is either fresh or flagged stale");

// 2. The NVDA Stock Token really is what the config says.
const [nvdaName, nvdaSymbol, nvdaDecimals] = await Promise.all([
  client.readContract({ address: NVDA_TOKEN, abi: erc20Abi, functionName: "name" }),
  client.readContract({ address: NVDA_TOKEN, abi: erc20Abi, functionName: "symbol" }),
  client.readContract({ address: NVDA_TOKEN, abi: erc20Abi, functionName: "decimals" }),
]);
line("NVDA token", `${nvdaName} (${nvdaSymbol}) decimals ${nvdaDecimals} at ${NVDA_TOKEN}`);
assert.equal(nvdaSymbol, "NVDA");
assert.equal(nvdaDecimals, 18);
assert.match(nvdaName, /NVIDIA/i);

// 3. Token + fee flow on a live Pons curve.
const token = await getChipTokenInfo(CHIP);
line("token", `${token.name} (${token.symbol}) supply ${token.totalSupply} curve ${token.curve} graduated ${token.graduated}`);
assert.ok(token.curve, "a Pons token exposes its curve");
assert.ok(token.priceEth && token.priceEth > 0, "curve reserves give a spot price");

// 4. Reserve fixture: the most frequent NVDA receiver in the last 20k blocks (unless given).
let RESERVE = process.env.RESERVE_WALLET as Address | undefined;
if (!RESERVE) {
  const logs = await client.getLogs({ address: NVDA_TOKEN, event: erc20Abi[5], fromBlock: head - 20_000n, toBlock: head });
  const counts = new Map<string, number>();
  for (const l of logs) if (l.args.to) counts.set(l.args.to, (counts.get(l.args.to) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  line("NVDA transfers (20k blocks)", `${logs.length}, top receivers ${ranked.slice(0, 3).map(([a, n]) => `${a.slice(0, 8)}… ×${n}`).join(", ")}`);
  assert.ok(ranked.length > 0, "the NVDA token moves on the chain");
  RESERVE = ranked[0][0] as Address;
}
line("reserve fixture", RESERVE);

const fees = await getFeeFlow(token.curve as Address, RESERVE);
line("fee flow", fees);
assert.equal(fees.feeBps, 100);
assert.equal(fees.protocolShareBps, 3000);
assert.equal(fees.toCoreBps, 70 + fees.creatorTaxBps);

// 5. Reserve: balance + cycle history from Transfer logs, incremental second pass.
const balance = await getReserveBalance(RESERVE);
line("reserve balance", `${balance.nvdaTokenBalance} ${balance.symbol} (${balance.name})`);
assert.equal(balance.symbol, "NVDA");
const first = await getCycleHistory(RESERVE, head - 20_000n);
line("executions (20k blocks)", `${first.executions.length} inflows, scanned to ${first.toBlock}`);
assert.ok(first.executions.length > 0, "the fixture receives NVDA");
for (const e of first.executions) {
  assert.ok(e.txHash && e.txHash.startsWith("0x"), "every execution carries its real tx hash");
  assert.ok(e.at > 0, "every execution has a block timestamp");
  assert.equal(e.inputUsd, null, "USD paid is never invented");
  assert.equal(e.executionPrice, null, "the execution price is never invented");
  assert.ok(e.nvdaAmount > 0);
}
assert.deepEqual(
  first.executions.map((e) => e.cycle),
  first.executions.map((_, i) => i + 1),
  "cycles are numbered chronologically",
);
const second = await getCycleHistory(RESERVE, first.toBlock + 1n, undefined, first.executions.length);
line("incremental pass", `${second.executions.length} new since ${first.toBlock + 1n}`);
if (second.executions[0]) assert.equal(second.executions[0].cycle, first.executions.length + 1, "incremental numbering continues");
const last = first.executions[first.executions.length - 1];
line("latest inflow", `${last.nvdaAmount} NVDA at ${new Date(last.at).toISOString()} tx ${last.txHash}`);

// 6. Trades on the curve → fees to the core.
const trades = await getCoreActivity({ curve: token.curve as Address, fromBlock: head - 30_000n, toBlock: head, toCoreBps: fees.toCoreBps, ethUsd: prices.ETH.price });
line("curve trades (30k blocks)", trades.length);
const feeSum = trades.reduce((s, t) => s + t.feeToCoreUsd, 0);
line("fees to core (USD)", feeSum.toFixed(4));
for (const t of trades) assert.ok(Math.abs(t.feeToCoreUsd - (t.quoteUsd ?? 0) * (fees.toCoreBps / 10_000)) < 1e-9, "fee = quote × share");

// 7. Core power = wallet ETH + escrow + creator share of unswept curve fees, valued in USD.
const core = await getCorePower({ reserveWallet: RESERVE, curve: token.curve, creatorShareBps: 10_000 - fees.protocolShareBps, ethUsd: prices.ETH.price, targetInputUsd: 1000, currentCycle: first.executions.length + 1, cycleStartedAt: last.at });
line("core power", `${core.state.corePowerPercent.toFixed(4)}% = $${core.state.currentInputUsd.toFixed(4)} (${core.state.inputEth} ETH: wallet ${core.breakdown.walletEth} + escrow ${core.breakdown.escrowEth} + curve share ${core.breakdown.curveEth})`);
assert.ok(Math.abs(core.breakdown.walletEth + core.breakdown.escrowEth + core.breakdown.curveEth - (core.state.inputEth ?? 0)) < 1e-12);
assert.ok(Math.abs(core.breakdown.curveEth - (fees.accruingOnCurveEth ?? 0) * 0.7) < 1e-9, "curve share = 70 % of quoteFeeBalance");

// 8. Derived cycles and metrics on the real history.
const cycles = deriveCycles(first.executions, { ...emptyChip(), currentCycle: first.executions.length + 1, cycleStartedAt: last.at });
const metrics = deriveMetrics(cycles, Date.now());
line("cycles", `${cycles.length} (1 active + ${cycles.length - 1} complete)`);
line("metrics", `active ${metrics.activeCycleMs != null ? Math.round(metrics.activeCycleMs / 1000) + "s" : "—"}, avg ${metrics.avgCycleMs != null ? Math.round(metrics.avgCycleMs / 1000) + "s" : "—"} over ${metrics.sampleSize}`);

console.log(`\nlive-check OK in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
