"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CHAIN_ID, RPC_URL } from "@/config/chains";
import { chipConfig } from "@/config/chip";
import { configIssues } from "@/config/contracts";
import { fmtAgo } from "@/lib/format";
import { useMounted, useNow } from "@/lib/hooks";
import { easeOutExpo } from "@/lib/motion";
import { useChip } from "@/lib/store/chip";
import type { ChipMode, SyncStatus } from "@/types/chip";

const SYNC_LABEL: Record<SyncStatus, string> = {
  unconfigured: "NOT CONFIGURED",
  syncing: "SYNCING",
  ok: "LIVE",
  stale: "LIVE · STALE",
  error: "LIVE · OFFLINE",
};

/**
 * DEMO or LIVE, in the footer (the navbar carries the X link). Opens a small sheet that says what the mode
 * means and, when the contracts are configured, lets the visitor switch.
 * The two modes never mix: switching wipes the store and restarts the engine.
 */
export function ModeBadge({ placement = "down" }: { placement?: "down" | "up" }) {
  const mounted = useMounted();
  const mode = useChip((s) => s.mode);
  const sync = useChip((s) => s.sync);
  const error = useChip((s) => s.error);
  const lastUpdated = useChip((s) => s.chip.lastUpdated);
  const price = useChip((s) => s.prices.NVDA);
  const setMode = useChip((s) => s.setMode);
  const now = useNow();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const demo = mode === "demo";
  const live = !demo && sync === "ok";
  const label = !mounted ? "…" : demo ? "DEMO" : SYNC_LABEL[sync];

  const pick = (m: ChipMode) => {
    if (m === mode) return;
    setMode(m);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={`chip h-9 px-3 ${live ? "chip-live" : ""} ${demo ? "chip-demo" : ""}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Data mode: ${label}`}>
        <span className={`dot ${live ? "dot-live" : ""} ${!demo && sync === "syncing" ? "animate-power-pulse" : ""}`} />
        {label}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Data mode"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.28, ease: easeOutExpo }}
            className={`panel absolute right-0 w-[310px] p-4 text-sm shadow-[0_30px_60px_-30px_rgba(0,0,0,1)] ${placement === "up" ? "bottom-full mb-2" : "mt-2"}`}
          >
            <div className="flex items-center justify-between">
              <span className="label">DATA MODE</span>
              <span className="mono text-[11px] text-muted">{label}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1 rounded-md border border-graphite p-1" role="radiogroup" aria-label="Mode">
              {(["demo", "live"] as ChipMode[]).map((m) => {
                const available = m === "demo" || chipConfig.liveAvailable;
                const selected = m === mode;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!available}
                    onClick={() => pick(m)}
                    className={`display-wide h-8 rounded text-[11px] tracking-[0.16em] transition ${selected ? "bg-graphite text-ink" : "text-muted hover:text-silver"} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {m.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 leading-relaxed text-silver">
              {demo ? (
                <>
                  Simulated fee events, core power, cycles and NVDA executions, so the mechanism can be seen end to end. Prices are real when the price feed answers. Nothing here carries a transaction hash, and every simulated
                  figure is marked <span className="chip chip-demo h-4 px-1 text-[8px]">DEMO DATA</span>.
                </>
              ) : sync === "error" ? (
                <>{error ?? "The RPC is not answering."}</>
              ) : sync === "stale" ? (
                <>{error ?? "The last read is older than expected."}</>
              ) : (
                <>Every figure comes from Robinhood Chain and the configured price source: contract values, wallet balances, on-chain events, transaction hashes. Nothing is simulated.</>
              )}
            </p>
            {!chipConfig.liveAvailable ? (
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                LIVE opens once <span className="mono text-silver">NEXT_PUBLIC_CHIP_TOKEN</span> and <span className="mono text-silver">NEXT_PUBLIC_RESERVE_WALLET</span> are set.
              </p>
            ) : null}

            <dl className="mono mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-graphite pt-3 text-[10px] text-muted">
              <dt>CHAIN</dt>
              <dd className="text-silver">Robinhood Chain · {CHAIN_ID}</dd>
              <dt>RPC</dt>
              <dd className="truncate text-silver">{RPC_URL.replace(/^https?:\/\//, "")}</dd>
              <dt>PRICE</dt>
              <dd className="truncate text-silver">{price ? `${price.sourceLabel}${price.stale ? " · stale" : ""}` : "—"}</dd>
              <dt>UPDATED</dt>
              <dd className="text-silver">{lastUpdated && now ? fmtAgo(lastUpdated, now) : "—"}</dd>
            </dl>
            {configIssues.length ? <p className="mono mt-3 text-[10px] text-energy-2">{configIssues[0].message}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
