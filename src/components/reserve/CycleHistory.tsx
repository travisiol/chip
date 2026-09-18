"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { DemoChip } from "@/components/ui/DemoChip";
import { explorer } from "@/config/chains";
import { clearHoverCycle, setHoverCycle } from "@/lib/chip/signals";
import { fmtAmount, fmtClock, fmtCycle, fmtDate, fmtDuration, fmtUsd, shortHash } from "@/lib/format";
import { useMounted } from "@/lib/hooks";
import { deriveCycles } from "@/lib/reserve/cycles";
import { useChip } from "@/lib/store/chip";

/**
 * PROCESSING HISTORY. A timeline of completed cycles: input, NVDA acquired,
 * transaction, time. In LIVE mode the hash is real or the cell is empty; in
 * DEMO mode there is no hash and the table says so.
 */
export function CycleHistory({ limit, className = "" }: { limit?: number; className?: string }) {
  const mounted = useMounted();
  const executions = useChip((s) => s.executions);
  const chip = useChip((s) => s.chip);
  const mode = useChip((s) => s.mode);
  const cycles = deriveCycles(executions, chip).filter((c) => c.status !== "active");
  const shown = limit ? cycles.slice(0, limit) : cycles;

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label flex items-center gap-2">
            Processing history <DemoChip />
          </div>
          <h3 className="display mt-2 text-[28px]">COMPLETED CYCLES</h3>
        </div>
        {limit && cycles.length > limit ? (
          <Link href="/reserve" className="trace-link text-[12px] tracking-[0.1em] uppercase">
            All {cycles.length} cycles →
          </Link>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="row hidden grid-cols-[92px_1fr_1fr_1fr_120px] border-t-0 pb-2 text-[10px] tracking-[0.16em] text-muted uppercase md:grid">
          <span>Cycle</span>
          <span>Core input</span>
          <span>NVDA acquired</span>
          <span>Tx</span>
          <span className="text-right">Time</span>
        </div>
        {!mounted || shown.length === 0 ? (
          <div className="row grid-cols-1 text-sm text-muted">No completed cycle yet.</div>
        ) : (
          <ol>
            {shown.map((c) => {
              const duration = c.startedAt != null && c.completedAt != null ? c.completedAt - c.startedAt : null;
              return (
                <li
                  key={c.id}
                  className="row metal-hover grid-cols-2 md:grid-cols-[92px_1fr_1fr_1fr_120px]"
                  onPointerEnter={() => setHoverCycle(c.id)}
                  onPointerLeave={() => clearHoverCycle(c.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="dot dot-live" />
                    <span className="mono text-[13px] text-ink">{fmtCycle(c.id)}</span>
                    <span className="label hidden text-[9px] md:inline">COMPLETE</span>
                  </div>
                  <div className="text-right md:text-left">
                    <span className="label mr-2 md:hidden">INPUT</span>
                    <span className="num text-[15px] text-ink">{c.inputUsd != null ? fmtUsd(c.inputUsd, 0) : "—"}</span>
                  </div>
                  <div>
                    <span className="label mr-2 md:hidden">NVDA</span>
                    <span className="num text-[15px] text-energy">{c.nvdaAmount != null ? `${fmtAmount(c.nvdaAmount, 4)} NVDA` : "—"}</span>
                    {c.executionPrice != null ? <span className="mono ml-2 text-[10px] text-muted">@ {fmtUsd(c.executionPrice, 2)}</span> : null}
                  </div>
                  <div className="mono text-right text-[12px] md:text-left">
                    {c.txHash ? (
                      <a href={explorer.tx(c.txHash)} target="_blank" rel="noreferrer" className="trace-link inline-flex items-center gap-1 text-silver">
                        {shortHash(c.txHash)} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-muted">{mode === "demo" ? "DEMO · NO TX" : "—"}</span>
                    )}
                  </div>
                  <div className="mono col-span-2 text-[11px] text-muted md:col-span-1 md:text-right">
                    {c.completedAt != null ? `${fmtDate(c.completedAt)} ${fmtClock(c.completedAt)}` : "—"}
                    {duration != null && duration > 0 ? <span className="ml-2 text-muted-2">· {fmtDuration(duration)}</span> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
