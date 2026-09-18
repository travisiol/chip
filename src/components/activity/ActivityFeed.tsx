"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { explorer } from "@/config/chains";
import { fmtAgo, shortHash } from "@/lib/format";
import { useMounted, useNow } from "@/lib/hooks";
import { easeOutExpo } from "@/lib/motion";
import { useChip } from "@/lib/store/chip";
import type { ActivityKind } from "@/types/transaction";

const KIND_CLASS: Record<ActivityKind, string> = {
  input: "text-ink",
  power: "text-silver",
  execution: "text-energy",
  cycle: "text-aluminum",
  system: "text-muted",
};

/**
 * LIVE CORE ACTIVITY. A short vertical list; new rows slide in from the top
 * and the rest move down. Around five rows — never a ticker.
 */
export function ActivityFeed({ limit = 5, className = "" }: { limit?: number; className?: string }) {
  const mounted = useMounted();
  const activity = useChip((s) => s.activity);
  const mode = useChip((s) => s.mode);
  const now = useNow();
  const rows = activity.slice(0, limit);

  return (
    <div className={className} aria-live="polite" aria-label="Live core activity">
      {!mounted || rows.length === 0 ? (
        <div className="row grid-cols-1 text-sm text-muted">Waiting for the first signal.</div>
      ) : (
        <ol className="relative">
          <AnimatePresence initial={false}>
            {rows.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.25 } }}
                transition={{ duration: 0.55, ease: easeOutExpo }}
                className="row grid-cols-[minmax(0,1fr)_auto] items-start"
              >
                <div className="min-w-0">
                  <div className={`num text-[18px] leading-tight ${KIND_CLASS[a.kind]}`}>
                    {a.value} <span className="display-wide ml-1 text-[11px] tracking-[0.18em] text-silver">{a.title}</span>
                  </div>
                  <div className="mono mt-1 flex items-center gap-3 text-[11px] text-muted">
                    <span>{now ? fmtAgo(a.at, now) : "—"}</span>
                    {a.txHash ? (
                      <a href={explorer.tx(a.txHash)} target="_blank" rel="noreferrer" className="trace-link inline-flex items-center gap-1">
                        {shortHash(a.txHash)} <ExternalLink size={10} />
                      </a>
                    ) : mode === "demo" && a.kind !== "power" && a.kind !== "cycle" ? (
                      <span className="chip chip-demo h-4 px-1 text-[8px]">DEMO</span>
                    ) : null}
                  </div>
                </div>
                <span className={`mt-2 dot ${a.kind === "execution" || a.kind === "input" ? "dot-live" : ""}`} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
