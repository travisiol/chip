"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface Props {
  kind: "error" | "stale" | "syncing" | "empty";
  title: string;
  body?: string;
  /** Called by RETRY; the button shows while it resolves. */
  onRetry?: () => Promise<unknown> | void;
  className?: string;
}

/**
 * Native error and waiting states — CORE DATA UNAVAILABLE, PRICE FEED
 * DELAYED, RESERVE SYNCING. Never a browser alert().
 */
export function StateNotice({ kind, title, body, onRetry, className = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const accent = kind === "error" ? "border-energy/50" : "border-metal-2";
  return (
    <div className={`panel flex flex-col gap-3 p-5 ${accent} ${className}`} role={kind === "error" ? "alert" : "status"}>
      <div className="flex items-center gap-3">
        <span className={`dot ${kind === "error" ? "dot-live" : ""} ${kind === "syncing" ? "animate-power-pulse" : ""}`} />
        <span className="display-wide text-[12px] tracking-[0.18em]">{title}</span>
      </div>
      {body ? <p className="text-sm leading-relaxed text-silver">{body}</p> : null}
      {onRetry ? (
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRetry();
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw size={12} className={busy ? "animate-spin-slow" : ""} /> RETRY
          </button>
        </div>
      ) : null}
    </div>
  );
}
