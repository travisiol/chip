"use client";

import { useChip } from "@/lib/store/chip";
import { useMounted } from "@/lib/hooks";

/** The DEMO DATA marker. Renders nothing in LIVE mode — simulated figures are never unmarked, real ones never mislabelled. */
export function DemoChip({ className = "", label = "DEMO DATA" }: { className?: string; label?: string }) {
  const mounted = useMounted();
  const mode = useChip((s) => s.mode);
  if (!mounted || mode !== "demo") return null;
  return (
    <span className={`chip chip-demo ${className}`} title="Simulated in DEMO mode. Switch to LIVE for on-chain figures.">
      {label}
    </span>
  );
}
