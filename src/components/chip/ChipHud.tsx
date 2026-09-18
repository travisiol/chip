"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SEQUENCE, STATUS_LABEL } from "@/lib/chip/machine";
import { fmtAmount, fmtCycle, fmtUsd } from "@/lib/format";
import { easeOutExpo } from "@/lib/motion";
import { useChip } from "@/lib/store/chip";

/**
 * The words of the signature moment, under the chip:
 * CORE FULL → EXECUTING NVDA PURCHASE (progress line) → +$1,000 NVDA · RESERVE UPDATED → NEW CYCLE STARTED.
 * Silent while powering; text always accompanies the colour.
 */
export function ChipHud() {
  const status = useChip((s) => s.chip.status);
  const statusSince = useChip((s) => s.statusSince);
  const cycle = useChip((s) => s.chip.currentCycle);
  const last = useChip((s) => s.reserve.lastExecution);
  const mode = useChip((s) => s.mode);

  const visible = status !== "POWERING";
  const executed = last ? (last.inputUsd != null ? `+${fmtUsd(last.inputUsd, 0)} NVDA` : `+${fmtAmount(last.nvdaAmount, 4)} NVDA`) : "";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center" role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {visible ? (
          <motion.div
            key={`${status}-${statusSince}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.32, ease: easeOutExpo }}
            className="panel-metal flex min-w-[240px] flex-col items-center gap-2 px-5 py-3 text-center"
          >
            <div className={`display-wide text-[12px] tracking-[0.2em] ${status === "IDLE" ? "text-muted" : "text-ink"}`}>
              {status === "EXECUTING" ? "EXECUTING NVDA PURCHASE" : STATUS_LABEL[status]}
              {status === "RESETTING" ? ` ${fmtCycle(cycle + 1)} STARTED` : ""}
            </div>
            {status === "FULL" ? <div className="label text-energy">100% · ALL PATHS CONVERGED</div> : null}
            {status === "EXECUTING" ? (
              <div className="h-px w-full overflow-hidden bg-graphite">
                <motion.div className="h-full bg-energy" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: SEQUENCE.executingMs / 1000, ease: "linear" }} />
              </div>
            ) : null}
            {status === "CONFIRMED" ? (
              <div className="num text-[22px] text-energy">
                {executed}
                {mode === "live" && last?.txHash ? <span className="label ml-2 text-muted">CONFIRMED</span> : null}
              </div>
            ) : null}
            {status === "IDLE" ? <div className="label">WAITING FOR DATA</div> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
