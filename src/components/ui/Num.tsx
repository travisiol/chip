"use client";

import { useSmoothNumber } from "@/lib/hooks";

interface Props {
  value: number;
  /** Formats the interpolated value; defaults to two decimals. */
  format?: (v: number) => string;
  /** Approach speed per second — higher snaps faster. */
  rate?: number;
  className?: string;
}

/** A number that glides between values instead of jumping. */
export function Num({ value, format = (v) => v.toFixed(2), rate = 6, className }: Props) {
  const v = useSmoothNumber(value, rate);
  return (
    <span className={className} aria-live="off">
      {format(v)}
    </span>
  );
}
