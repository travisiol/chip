import { chipConfig } from "@/config/chip";
import { isSequenceRunning, runExecutionSequence } from "@/lib/chip/machine";
import { logNormal, type Rng } from "@/lib/chip/prng";
import { fetchPrices } from "@/lib/pricing/client";
import { useChip, type ChipStore } from "@/lib/store/chip";
import type { Execution } from "@/types/cycle";
import type { PriceBook } from "@/types/price";
import { buildDemoSeed } from "./seed";

/**
 * DEMO MODE. Simulates the loop end to end — trades, fees, the core powering,
 * the execution, the reset — on the same store the chain sync feeds in LIVE
 * mode, so every screen behaves identically once the site goes live. Prices
 * are real when the price layer answers (and are labelled with their
 * source); nothing here carries a transaction hash; the navbar says DEMO.
 */
export class DemoEngine {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private priceTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private rng: Rng = Math.random;
  private nvdaPrice: number = chipConfig.demo.fallbackNvdaPrice;
  private ethPrice: number = chipConfig.demo.fallbackEthPrice;
  private onVisibility = () => {
    if (document.hidden) this.pause();
    else this.resume();
  };

  constructor(private readonly store: () => ChipStore = useChip.getState) {}

  get isRunning() {
    return this.running;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    // Seed at once on the fallback prices — the chip must never wait on the network —
    // then re-seed on the real prices if they arrive within the first seconds, so the
    // history and the mark price agree.
    this.seed({});
    const seededAt = Date.now();
    let book: PriceBook = {};
    try {
      book = await fetchPrices(["NVDA", "ETH"]);
    } catch {
      book = {};
    }
    if (!this.running) return;
    if (book.NVDA) this.nvdaPrice = book.NVDA.price;
    if (book.ETH) this.ethPrice = book.ETH.price;
    if ((book.NVDA || book.ETH) && Date.now() - seededAt < 4_000 && !isSequenceRunning()) this.seed(book);
    else if (book.NVDA) {
      const s = this.store();
      s.setPrices(book);
      s.setReserve({ reserveValueUsd: s.reserve.nvdaTokenBalance * this.nvdaPrice, lastUpdated: Date.now() });
    }
    this.schedule(1_600);
    this.priceTimer = setInterval(() => void this.refreshPrices(), chipConfig.polling.priceMs);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** Builds the opening state on the current prices and writes it to the store. */
  private seed(book: PriceBook) {
    const seed = buildDemoSeed(Date.now(), this.nvdaPrice, this.ethPrice);
    this.rng = seed.rng;
    // Never touches `mode`: the runtime owns it.
    useChip.setState({
      sync: "ok",
      error: null,
      chip: seed.chip,
      statusSince: Date.now(),
      pendingInputUsd: 0,
      fees: [],
      lastCheckpointPct: seed.chip.corePowerPercent,
      reserve: seed.reserve,
      executions: seed.executions,
      activity: seed.activity,
      trades: seed.trades,
      prices: book,
      token: seed.token,
      feeFlow: seed.feeFlow,
    });
  }

  stop() {
    this.running = false;
    this.pause();
    if (this.priceTimer) clearInterval(this.priceTimer);
    this.priceTimer = null;
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private pause() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private resume() {
    if (this.running && !this.timer) this.schedule(1_200);
  }

  private schedule(ms?: number) {
    if (!this.running) return;
    const [lo, hi] = chipConfig.demo.tradeGapMs;
    const gap = ms ?? lo + this.rng() * (hi - lo);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), gap);
  }

  private tick() {
    this.timer = null;
    const s = this.store();
    if (!this.running || s.mode !== "demo") return;
    if (s.chip.status !== "POWERING" || isSequenceRunning()) {
      this.schedule(1_500);
      return;
    }
    const target = s.chip.targetInputUsd;
    const remaining = Math.max(0, target - s.chip.currentInputUsd - s.pendingInputUsd);
    let fee = Math.round(logNormal(this.rng, 11, 0.75) * 100) / 100;
    fee = Math.min(Math.max(fee, 1.2), 64);
    // The trade that tops the core lands exactly on the target.
    const tops = fee >= remaining - 0.005;
    if (tops) fee = Math.round(remaining * 100) / 100;
    const quoteEth = fee / this.ethPrice / 0.007;
    const at = Date.now();
    s.applyFee(fee, { at, credit: true });
    s.pushTrade({ id: `demo-trade-${at}`, side: this.rng() > 0.42 ? "buy" : "sell", quoteEth, quoteUsd: quoteEth * this.ethPrice, feeToCoreUsd: fee, trader: null, txHash: null, blockNumber: null, at });

    if (tops) {
      // Wait for the last signal to land, then play the signature moment.
      setTimeout(() => this.execute(), chipConfig.signalMs + 350);
      return;
    }
    this.schedule();
  }

  private execute() {
    const s = this.store();
    if (!this.running || s.mode !== "demo") return;
    const target = s.chip.targetInputUsd;
    s.setChip({ currentInputUsd: target });
    const execution: Execution = {
      id: `demo-cycle-${s.chip.currentCycle}`,
      cycle: s.chip.currentCycle,
      at: Date.now() + 2_800,
      inputUsd: target,
      nvdaAmount: target / this.nvdaPrice,
      executionPrice: this.nvdaPrice,
      txHash: null,
      status: "confirmed",
    };
    void runExecutionSequence(s, execution).then(() => {
      const st = this.store();
      const balance = st.reserve.nvdaTokenBalance + execution.nvdaAmount;
      st.setReserve({ nvdaTokenBalance: balance, reserveValueUsd: balance * this.nvdaPrice, totalRouted: (st.reserve.totalRouted ?? 0) + target, lastUpdated: Date.now() });
      useChip.setState({ lastCheckpointPct: 0 });
      this.schedule(2_500);
    });
  }

  private async refreshPrices() {
    const s = this.store();
    if (!this.running || s.mode !== "demo") return;
    try {
      const book = await fetchPrices(["NVDA", "ETH"]);
      if (book.NVDA) this.nvdaPrice = book.NVDA.price;
      if (book.ETH) this.ethPrice = book.ETH.price;
      s.setPrices(book);
      s.setReserve({ reserveValueUsd: s.reserve.nvdaTokenBalance * this.nvdaPrice, lastUpdated: Date.now() });
    } catch {
      // keep the last prices
    }
  }
}
