import { create } from "zustand";
import { chipConfig } from "@/config/chip";
import type { ChipMode, ChipState, ChipStatus, FeeEvent, SyncStatus } from "@/types/chip";
import type { Execution } from "@/types/cycle";
import type { PriceBook } from "@/types/price";
import type { ChipTokenInfo, FeeFlow, ReserveState } from "@/types/reserve";
import type { ActivityItem, TradeEvent } from "@/types/transaction";
import { clamp, fmtPct } from "@/lib/format";

const ACTIVITY_CAP = 80;
const FEE_CAP = 10;
const TRADES_CAP = 200;
const INPUT_PINS = 27;

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
let pinCursor = 4;

const MODE_KEY = "chip:mode";

/** The mode a fresh page opens in: LIVE when configured (unless the visitor chose DEMO last time), DEMO otherwise. */
export function initialMode(): ChipMode {
  if (!chipConfig.liveAvailable) return "demo";
  try {
    return localStorage.getItem(MODE_KEY) === "demo" ? "demo" : "live";
  } catch {
    return "live";
  }
}

export const emptyChip = (): ChipState => ({
  corePowerPercent: 0,
  currentInputUsd: 0,
  targetInputUsd: chipConfig.targetInputUsd,
  currentCycle: 1,
  status: "IDLE",
  lastUpdated: 0,
  cycleStartedAt: null,
});

export const emptyReserve = (): ReserveState => ({
  reserveValueUsd: null,
  nvdaTokenBalance: 0,
  totalCycles: 0,
  totalRouted: null,
  lastExecution: null,
  lastUpdated: 0,
});

const withPercent = (c: ChipState): ChipState => ({
  ...c,
  corePowerPercent: c.targetInputUsd > 0 ? clamp((c.currentInputUsd / c.targetInputUsd) * 100, 0, 100) : 0,
});

export interface ChipStore {
  mode: ChipMode;
  sync: SyncStatus;
  error: string | null;

  chip: ChipState;
  statusSince: number;
  /** Set when the core reaches 100 %; the scene reads it for the white-green pulse. */
  flashAt: number;
  /** Input that is still travelling to the core as a signal (DEMO credits it on landing). */
  pendingInputUsd: number;
  /** Recent signals — the scene animates them along their pin's route. */
  fees: FeeEvent[];
  /** Power level at the last CORE POWER checkpoint row. */
  lastCheckpointPct: number;

  reserve: ReserveState;
  /** Newest first. */
  executions: Execution[];
  trades: TradeEvent[];
  activity: ActivityItem[];
  prices: PriceBook;
  token: ChipTokenInfo | null;
  feeFlow: FeeFlow | null;

  setMode: (mode: ChipMode) => void;
  setSync: (sync: SyncStatus, error?: string | null) => void;
  setChip: (patch: Partial<ChipState>) => void;
  setStatus: (status: ChipStatus) => void;
  flash: () => void;
  /**
   * A fee entered the chip. A signal leaves a pin and reaches the core after
   * `signalMs`; with `credit` the input is added on landing (DEMO — the
   * simulation is the truth), without it the signal is purely visual (LIVE —
   * the chain read is the truth).
   */
  applyFee: (amountUsd: number, meta?: { credit?: boolean; txHash?: ActivityItem["txHash"]; at?: number }) => void;
  landFee: (id: string) => void;
  /** Push a CORE POWER row when the level moved enough since the last one. */
  checkpoint: () => void;
  pushActivity: (item: Omit<ActivityItem, "id" | "at"> & { at?: number }) => void;
  pushTrade: (trade: TradeEvent) => void;
  setReserve: (patch: Partial<ReserveState>) => void;
  setExecutions: (list: Execution[]) => void;
  addExecution: (execution: Execution) => void;
  setPrices: (book: PriceBook) => void;
  setToken: (info: ChipTokenInfo | null) => void;
  setFeeFlow: (flow: FeeFlow | null) => void;
  /** Wipe everything data-related (a fresh sync or a mode switch). */
  resetData: () => void;
}

const landTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useChip = create<ChipStore>()((set, get) => ({
  mode: "demo",
  sync: "syncing",
  error: null,

  chip: emptyChip(),
  statusSince: 0,
  flashAt: 0,
  pendingInputUsd: 0,
  fees: [],
  lastCheckpointPct: 0,

  reserve: emptyReserve(),
  executions: [],
  trades: [],
  activity: [],
  prices: {},
  token: null,
  feeFlow: null,

  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // ignore
    }
    set({ mode });
  },
  setSync: (sync, error = null) => set({ sync, error }),
  setChip: (patch) => set((s) => ({ chip: withPercent({ ...s.chip, ...patch }) })),
  setStatus: (status) => set((s) => ({ chip: { ...s.chip, status }, statusSince: Date.now() })),
  flash: () => set({ flashAt: Date.now() }),

  applyFee: (amountUsd, meta = {}) => {
    if (!(amountUsd > 0)) return;
    const at = meta.at ?? Date.now();
    const id = nextId("fee");
    pinCursor = (pinCursor + 7) % INPUT_PINS;
    const fee: FeeEvent = { id, amountUsd, at, pin: pinCursor, landed: false };
    set((s) => ({ fees: [...s.fees, fee].slice(-FEE_CAP), pendingInputUsd: meta.credit ? s.pendingInputUsd + amountUsd : s.pendingInputUsd }));
    const timer = setTimeout(() => {
      landTimers.delete(id);
      get().landFee(id);
      if (meta.txHash !== undefined || meta.credit) {
        get().pushActivity({ kind: "input", title: "CORE INPUT", value: `+$${amountUsd.toFixed(2)}`, at: Date.now(), txHash: meta.txHash ?? null });
        get().checkpoint();
      }
    }, chipConfig.signalMs);
    landTimers.set(id, timer);
  },

  landFee: (id) =>
    set((s) => {
      const fee = s.fees.find((f) => f.id === id);
      if (!fee || fee.landed) return {};
      const credited = s.pendingInputUsd > 0 ? Math.min(fee.amountUsd, s.pendingInputUsd) : 0;
      const chip = credited > 0 ? withPercent({ ...s.chip, currentInputUsd: s.chip.currentInputUsd + credited, lastUpdated: Date.now() }) : s.chip;
      return {
        chip,
        pendingInputUsd: Math.max(0, s.pendingInputUsd - credited),
        fees: s.fees.map((f) => (f.id === id ? { ...f, landed: true } : f)),
      };
    }),

  checkpoint: () =>
    set((s) => {
      const pct = s.chip.corePowerPercent;
      if (Math.abs(pct - s.lastCheckpointPct) < 1.5 || pct >= 100) return {};
      const row: ActivityItem = { id: nextId("act"), kind: "power", title: "CORE POWER", value: `${fmtPct(s.lastCheckpointPct)} → ${fmtPct(pct)}`, at: Date.now(), txHash: null };
      return { lastCheckpointPct: pct, activity: [row, ...s.activity].slice(0, ACTIVITY_CAP) };
    }),

  pushActivity: (item) =>
    set((s) => ({
      activity: [{ ...item, id: nextId("act"), at: item.at ?? Date.now() }, ...s.activity].slice(0, ACTIVITY_CAP),
    })),
  pushTrade: (trade) => set((s) => ({ trades: [trade, ...s.trades].slice(0, TRADES_CAP) })),

  setReserve: (patch) => set((s) => ({ reserve: { ...s.reserve, ...patch } })),
  setExecutions: (list) =>
    set((s) => {
      const sorted = [...list].sort((a, b) => b.at - a.at);
      return { executions: sorted, reserve: { ...s.reserve, totalCycles: sorted.length, lastExecution: sorted[0] ?? null } };
    }),
  addExecution: (execution) =>
    set((s) => {
      if (s.executions.some((p) => p.id === execution.id)) return {};
      const executions = [execution, ...s.executions];
      return { executions, reserve: { ...s.reserve, totalCycles: executions.length, lastExecution: execution } };
    }),
  setPrices: (book) => set((s) => ({ prices: { ...s.prices, ...book } })),
  setToken: (token) => set({ token }),
  setFeeFlow: (feeFlow) => set({ feeFlow }),

  resetData: () => {
    landTimers.forEach(clearTimeout);
    landTimers.clear();
    set({
      sync: "syncing",
      error: null,
      chip: emptyChip(),
      statusSince: 0,
      flashAt: 0,
      pendingInputUsd: 0,
      fees: [],
      lastCheckpointPct: 0,
      reserve: emptyReserve(),
      executions: [],
      trades: [],
      activity: [],
      prices: {},
      token: null,
      feeFlow: null,
    });
  },
}));

/** Non-React access for engines and the WebGL frame loop (no re-render, no subscription). */
export const getChip = () => useChip.getState();

/** Derived: how much is left before the next execution. */
export const remainingUsd = (c: ChipState) => Math.max(0, c.targetInputUsd - c.currentInputUsd);
