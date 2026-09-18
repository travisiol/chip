"use client";

import { ExternalLink } from "lucide-react";
import { CurrentCycle } from "@/components/reserve/CurrentCycle";
import { DemoChip } from "@/components/ui/DemoChip";
import { StateNotice } from "@/components/ui/StateNotice";
import { refreshLive } from "@/components/ChipRuntime";
import { explorer } from "@/config/chains";
import { fmtAgo, fmtEth, fmtUsd, shortAddress, shortHash } from "@/lib/format";
import { useMounted, useNow } from "@/lib/hooks";
import { useChip } from "@/lib/store/chip";
import { ActivityFeed } from "./ActivityFeed";

/** /activity — the whole feed and every trade seen on the curve since the page opened. */
export function ActivityPage() {
  const mounted = useMounted();
  const trades = useChip((s) => s.trades);
  const sync = useChip((s) => s.sync);
  const error = useChip((s) => s.error);
  const mode = useChip((s) => s.mode);
  const now = useNow();

  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-28 pb-24 md:px-8">
      <div className="label flex items-center gap-2">
        Activity <DemoChip />
      </div>
      <h1 className="display mt-3 text-[clamp(40px,6vw,88px)]">LIVE CORE ACTIVITY</h1>

      {mounted && mode === "live" && sync === "error" ? <StateNotice kind="error" title="CORE DATA UNAVAILABLE" body={error ?? "The RPC did not answer."} onRetry={refreshLive} className="mt-8" /> : null}

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div className="flex flex-col gap-10">
          <CurrentCycle />
          <div className="panel p-5 md:p-7">
            <div className="label">Feed</div>
            <ActivityFeed limit={24} className="mt-3" />
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <div>
              <div className="label">Trades</div>
              <h2 className="display mt-2 text-[28px]">ON THE CURVE</h2>
            </div>
            <span className="mono text-[11px] text-muted">{mounted ? `${trades.length} seen` : ""}</span>
          </div>
          <div className="mt-5">
            <div className="row hidden grid-cols-[70px_1fr_1fr_1fr_90px] border-t-0 pb-2 text-[10px] tracking-[0.16em] text-muted uppercase md:grid">
              <span>Side</span>
              <span>Size</span>
              <span>To core</span>
              <span>Trader · Tx</span>
              <span className="text-right">When</span>
            </div>
            {!mounted || trades.length === 0 ? (
              <div className="row grid-cols-1 text-sm text-muted">{mode === "live" ? "Watching the curve from the current block onward." : "Waiting for the first trade."}</div>
            ) : (
              <ol>
                {trades.slice(0, 60).map((t) => (
                  <li key={t.id} className="row metal-hover grid-cols-2 md:grid-cols-[70px_1fr_1fr_1fr_90px]">
                    <div className={`display-wide text-[11px] tracking-[0.18em] ${t.side === "buy" ? "text-energy" : "text-silver"}`}>{t.side.toUpperCase()}</div>
                    <div className="num text-right text-[15px] text-ink md:text-left">
                      {t.quoteUsd != null ? fmtUsd(t.quoteUsd, 2) : fmtEth(t.quoteEth)}
                      <span className="mono ml-2 text-[10px] text-muted">{fmtEth(t.quoteEth)}</span>
                    </div>
                    <div className="num text-[15px] text-energy">+{fmtUsd(t.feeToCoreUsd, 2)}</div>
                    <div className="mono text-right text-[11px] text-silver md:text-left">
                      {t.trader ? shortAddress(t.trader) : "—"}
                      {t.txHash ? (
                        <a href={explorer.tx(t.txHash)} target="_blank" rel="noreferrer" className="trace-link ml-2 inline-flex items-center gap-1 text-muted">
                          {shortHash(t.txHash)} <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="chip chip-demo ml-2 h-4 px-1 text-[8px]">DEMO</span>
                      )}
                    </div>
                    <div className="mono col-span-2 text-[11px] text-muted md:col-span-1 md:text-right">{now ? fmtAgo(t.at, now) : "—"}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
