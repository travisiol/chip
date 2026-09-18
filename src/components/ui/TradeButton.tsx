"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { chipConfig } from "@/config/chip";
import { setHover } from "@/lib/chip/signals";
import { toast } from "@/lib/toast";

/**
 * TRADE CHIP. Links to the venue once a token is configured; before that it
 * says so instead of pretending. Hovering it makes the chip react a little.
 */
export function TradeButton({ className = "", size = "md" }: { className?: string; size?: "md" | "sm" }) {
  const cls = `btn btn-primary ${size === "sm" ? "btn-sm" : ""} ${className}`;
  const hover = { onPointerEnter: () => setHover(true), onPointerLeave: () => setHover(false) };
  if (chipConfig.tradeUrl) {
    return (
      <a href={chipConfig.tradeUrl} target="_blank" rel="noreferrer" className={cls} {...hover}>
        <span>TRADE CHIP</span>
        <ArrowUpRight size={14} />
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...hover} onClick={() => toast({ kind: "info", title: "CHIP is not launched yet", body: "TRADE CHIP opens the venue once the token contract is published here." })}>
      <span>TRADE CHIP</span>
    </button>
  );
}

export function ReserveButton({ className = "", size = "md" }: { className?: string; size?: "md" | "sm" }) {
  return (
    <Link href="/reserve" className={`btn btn-ghost ${size === "sm" ? "btn-sm" : ""} ${className}`}>
      <span>VIEW RESERVE</span>
    </Link>
  );
}
