import type { ReactNode } from "react";

/** Small mono caption above a figure. Extra classes win (utilities beat the layered .label). */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`label ${className}`}>{children}</div>;
}
