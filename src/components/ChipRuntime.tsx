"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { chipConfig } from "@/config/chip";
import { cancelSequence, runExecutionSequence } from "@/lib/chip/machine";
import { DemoEngine } from "@/lib/demo/engine";
import { LiveSync } from "@/lib/live/sync";
import { initialMode, useChip } from "@/lib/store/chip";
import type { ChipMode } from "@/types/chip";

interface QaHooks {
  /** Push the core to a percentage (visual QA of the fill). */
  fill: (pct: number) => void;
  /** Play the cycle-end sequence once with a synthetic execution (visual QA of the signature moment). */
  execute: () => Promise<void>;
  /** Send a fee signal into the chip. */
  fee: (usd: number) => void;
}

declare global {
  interface Window {
    __chip?: { live: LiveSync; demo: DemoEngine; store: typeof useChip; qa: QaHooks };
  }
}

/**
 * Runs the engine for the current mode: the chain sync in LIVE, the
 * simulation in DEMO. Switching modes wipes the store and restarts, so the
 * two never mix. Mounted once, inside the providers; nothing renders. In
 * development a QA hook is exposed on window so the animations can be
 * exercised on demand; it is absent from production bundles.
 */
let active: LiveSync | null = null;

export function ChipRuntime() {
  const qc = useQueryClient();
  const mode = useChip((s) => s.mode);
  const live = useRef<LiveSync | null>(null);
  const demo = useRef<DemoEngine | null>(null);
  const decided = useRef(false);

  useEffect(() => {
    // The mode a fresh page opens in is decided on the client (localStorage); the store starts in DEMO for SSR.
    // Decide once, before any engine starts, so nothing runs twice.
    if (!decided.current) {
      decided.current = true;
      const wanted = initialMode();
      if (useChip.getState().mode !== wanted) {
        useChip.setState({ mode: wanted });
        return;
      }
    }
    if (!live.current) live.current = new LiveSync(qc);
    if (!demo.current) demo.current = new DemoEngine();
    const sync = live.current;
    const sim = demo.current;
    active = sync;
    const run = (m: ChipMode) => {
      cancelSequence();
      useChip.getState().resetData();
      if (m === "live" && chipConfig.liveAvailable) sync.start();
      else void sim.start();
    };
    run(mode);
    if (process.env.NODE_ENV !== "production") {
      window.__chip = {
        live: sync,
        demo: sim,
        store: useChip,
        qa: {
          fill: (pct) => useChip.getState().setChip({ currentInputUsd: (useChip.getState().chip.targetInputUsd * pct) / 100, lastUpdated: Date.now() }),
          execute: () => {
            const s = useChip.getState();
            const price = s.prices.NVDA?.price ?? null;
            s.setChip({ currentInputUsd: s.chip.targetInputUsd });
            return runExecutionSequence(s, {
              id: `qa-${Date.now()}`,
              cycle: s.chip.currentCycle,
              at: Date.now(),
              inputUsd: s.chip.targetInputUsd,
              nvdaAmount: price ? s.chip.targetInputUsd / price : 1,
              executionPrice: price,
              txHash: null,
              status: "confirmed",
            });
          },
          fee: (usd) => useChip.getState().applyFee(usd, { credit: useChip.getState().mode === "demo" }),
        },
      };
    }
    return () => {
      cancelSequence();
      sync.stop();
      sim.stop();
    };
  }, [qc, mode]);

  return null;
}

/** RETRY handlers reach the sync through here. */
export function refreshLive() {
  return active?.refresh() ?? Promise.resolve();
}
