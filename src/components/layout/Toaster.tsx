"use client";

import { AnimatePresence, motion } from "framer-motion";
import { dismiss, useToasts } from "@/lib/toast";
import { easeOutExpo } from "@/lib/motion";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[96] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease: easeOutExpo }}
            className={`panel pointer-events-auto p-3.5 text-sm ${t.kind === "error" ? "border-energy/60" : ""}`}
            role={t.kind === "error" ? "alert" : "status"}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 dot ${t.kind === "error" ? "dot-live" : ""}`} />
              <div className="flex-1">
                <div className="display-wide text-[11px] tracking-[0.16em]">{t.title}</div>
                {t.body ? <p className="mt-1 text-[12px] leading-relaxed text-silver">{t.body}</p> : null}
              </div>
              <button type="button" className="label hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
