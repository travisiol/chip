import type { QueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { CHIP_TOKEN, RESERVE_WALLET } from "@/config/contracts";
import { chipConfig } from "@/config/chip";
import { describeRpcError, getChipTokenInfo, getCoreActivity, getCorePower, getCycleHistory, getFeeFlow, getReserveBalance, publicClient } from "@/lib/blockchain";
import type { CoreBreakdown } from "@/lib/blockchain/readChip";
import { isSequenceRunning, runExecutionSequence } from "@/lib/chip/machine";
import { fetchPrices } from "@/lib/pricing/client";
import { useChip, type ChipStore } from "@/lib/store/chip";

/**
 * LIVE MODE. Polls the chain and the price layer on their own cadences and
 * writes normalized state into the store. Only actual on-chain values ever
 * enter the store from here — no simulation, no smoothing of the truth.
 *
 * The signature moment is triggered by what the chain shows: a new NVDA
 * inflow to the reserve wallet plays FULL → CONFIRMED → RESETTING.
 */
export class LiveSync {
  private running = false;
  private timers: Array<ReturnType<typeof setTimeout>> = [];
  private lastTradeBlock: bigint | null = null;
  private scannedToBlock: bigint | null = null;
  private seeded = false;
  breakdown: CoreBreakdown | null = null;

  constructor(
    private readonly qc: QueryClient,
    private readonly store: () => ChipStore = useChip.getState,
  ) {}

  get isRunning() {
    return this.running;
  }

  start() {
    if (this.running || !CHIP_TOKEN || !RESERVE_WALLET) return;
    this.running = true;
    this.store().setSync("syncing");
    void this.boot();
  }

  /** Prices and token facts first — the core cannot be valued without them — then the polling loops. */
  private async boot() {
    await Promise.allSettled([this.syncPrices(), this.syncToken()]);
    if (!this.running) return;
    void this.loop(chipConfig.polling.priceMs, () => this.syncPrices());
    void this.loop(60_000, () => this.syncToken());
    void this.loop(chipConfig.polling.reserveMs, () => this.syncReserve());
    void this.loop(chipConfig.polling.coreMs, () => this.syncCore());
    void this.loop(chipConfig.polling.tradesMs, () => this.syncTrades());
  }

  stop() {
    this.running = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /** RETRY from an error notice: run every read once, now. */
  async refresh() {
    this.store().setSync("syncing");
    await Promise.allSettled([this.syncPrices(), this.syncToken(), this.syncReserve(), this.syncCore(), this.syncTrades()]);
  }

  private async loop(everyMs: number, fn: () => Promise<void>) {
    if (!this.running) return;
    try {
      await fn();
    } catch (e) {
      this.store().setSync("error", describeRpcError(e));
    }
    if (!this.running) return;
    this.timers.push(setTimeout(() => void this.loop(everyMs, fn), everyMs));
  }

  private fetch<T>(key: unknown[], fn: () => Promise<T>, staleMs: number) {
    return this.qc.fetchQuery({ queryKey: key, queryFn: fn, staleTime: staleMs });
  }

  private async syncPrices() {
    const book = await this.fetch(["prices"], () => fetchPrices(["NVDA", "ETH"]), 20_000);
    const s = this.store();
    s.setPrices(book);
    const nvda = book.NVDA ?? s.prices.NVDA;
    if (nvda) s.setReserve({ reserveValueUsd: s.reserve.nvdaTokenBalance * nvda.price, lastUpdated: Date.now() });
  }

  private async syncToken() {
    const info = await this.fetch(["token", CHIP_TOKEN], () => getChipTokenInfo(CHIP_TOKEN as Address), 30_000);
    const s = this.store();
    s.setToken(info);
    if (info.curve) s.setFeeFlow(await this.fetch(["feeFlow", info.curve], () => getFeeFlow(info.curve as Address, RESERVE_WALLET), 30_000));
  }

  private async syncReserve() {
    const wallet = RESERVE_WALLET as Address;
    // First pass scans from the configured start block; later passes only the blocks since.
    const fromBlock = this.scannedToBlock === null ? chipConfig.reserveStartBlock : this.scannedToBlock + 1n;
    const known = this.store().executions.length;
    const [balance, scan] = await Promise.all([
      this.fetch(["reserveBalance", wallet], () => getReserveBalance(wallet), 5_000),
      this.fetch(["cycles", wallet, fromBlock.toString()], () => getCycleHistory(wallet, fromBlock, undefined, known), 5_000),
    ]);
    this.scannedToBlock = scan.toBlock;
    // Read the store after the awaits: prices may have landed meanwhile.
    const s = this.store();
    const nvda = s.prices.NVDA;
    const ids = new Set(s.executions.map((p) => p.id));
    const fresh = scan.executions.filter((p) => !ids.has(p.id));
    if (!this.seeded) {
      this.seeded = true;
      s.setExecutions(fresh);
    } else if (fresh.length > 0 && !isSequenceRunning()) {
      // The chain says an execution happened: play the signature moment on the newest one, add the rest quietly.
      const newest = fresh[fresh.length - 1];
      fresh.slice(0, -1).forEach((p) => s.addExecution(p));
      void runExecutionSequence(s, newest, { skipExecuting: true, nextCycleStartsAt: newest.at });
    }
    const all = this.store().executions;
    s.setReserve({
      nvdaTokenBalance: balance.nvdaTokenBalance,
      reserveValueUsd: nvda ? balance.nvdaTokenBalance * nvda.price : null,
      totalCycles: all.length,
      lastExecution: all[0] ?? null,
      lastUpdated: Date.now(),
    });
    s.setSync("ok");
  }

  private async syncCore() {
    const s = this.store();
    const wallet = RESERVE_WALLET as Address;
    const eth = s.prices.ETH?.price ?? null;
    const last = s.executions[0] ?? null;
    const result = await this.fetch(
      ["core", wallet, eth ?? "no-price", s.token?.curve ?? "no-curve"],
      () =>
        getCorePower({
          reserveWallet: wallet,
          curve: s.token?.curve ?? null,
          creatorShareBps: s.feeFlow ? 10_000 - s.feeFlow.protocolShareBps : 7_000,
          ethUsd: eth,
          targetInputUsd: chipConfig.targetInputUsd,
          currentCycle: s.executions.length + 1,
          cycleStartedAt: last?.at ?? null,
        }),
      3_000,
    );
    this.breakdown = result.breakdown;
    if (isSequenceRunning()) return;
    s.setChip(result.state);
    s.checkpoint();
    const st = this.store();
    if (eth == null) {
      st.setSync("stale", "No ETH price source is answering; the core input cannot be valued.");
      return;
    }
    const { status } = st.chip;
    if (status === "IDLE") st.setStatus("POWERING");
    if (result.state.currentInputUsd >= result.state.targetInputUsd && (status === "POWERING" || status === "IDLE")) {
      st.setStatus("FULL");
      st.flash();
      st.pushActivity({ kind: "power", title: "CORE FULL", value: "EXECUTION ELIGIBLE" });
    } else if (result.state.currentInputUsd < result.state.targetInputUsd && status === "FULL") {
      st.setStatus("POWERING");
    }
    // The site is only "ok" once the cycle history has been scanned: no #001 before the truth.
    if (this.seeded) st.setSync("ok");
  }

  private async syncTrades() {
    const s = this.store();
    const curve = s.token?.curve;
    if (!curve) return;
    const client = publicClient();
    const head = await client.getBlockNumber();
    if (this.lastTradeBlock === null) {
      this.lastTradeBlock = head; // start from now: the feed shows what happens from here on
      return;
    }
    if (head <= this.lastTradeBlock) return;
    const trades = await getCoreActivity({
      curve,
      fromBlock: this.lastTradeBlock + 1n,
      toBlock: head,
      toCoreBps: s.feeFlow?.toCoreBps ?? 70,
      ethUsd: s.prices.ETH?.price ?? null,
    });
    this.lastTradeBlock = head;
    for (const t of trades) {
      s.pushTrade(t);
      if (t.feeToCoreUsd > 0 && !isSequenceRunning()) s.applyFee(t.feeToCoreUsd, { txHash: t.txHash, at: t.at });
    }
  }
}
