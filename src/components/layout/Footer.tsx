import Link from "next/link";
import { ChipMark } from "@/components/brand/ChipMark";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { XIcon } from "@/components/ui/XLink";
import { chipConfig } from "@/config/chip";

export function Footer() {
  return (
    <footer className="relative z-[2] border-t border-graphite">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <ChipMark size={30} className="text-ink" />
            <span className="display text-2xl">CHIP</span>
          </div>
          <p className="display-wide mt-4 text-[11px] tracking-[0.22em] text-silver">TRADE. POWER. BUILD NVDA.</p>
        </div>
        <nav className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Footer">
          <Link href="/#core" className="nav-link">
            Core
          </Link>
          <Link href="/reserve" className="nav-link">
            Reserve
          </Link>
          <Link href="/activity" className="nav-link">
            Activity
          </Link>
          <Link href="/#transparency" className="nav-link">
            Transparency
          </Link>
          <Link href="/dashboard" className="nav-link">
            Dashboard
          </Link>
          {chipConfig.site.twitter ? (
            <a href={chipConfig.site.twitter} target="_blank" rel="noreferrer" className="nav-link inline-flex items-center gap-1.5">
              <XIcon size={11} /> <span className="normal-case tracking-[0.04em]">@Chip_nvid</span>
            </a>
          ) : null}
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pb-10 md:flex-row md:items-start md:justify-between md:px-8">
        <p className="max-w-3xl text-[11px] leading-relaxed text-muted">
          CHIP is an independent token project on Robinhood Chain. It is not affiliated with, endorsed by, or connected to NVIDIA Corporation or Robinhood Markets, Inc. The reserve holds NVDA Stock Tokens — a tokenized asset
          issued on Robinhood Chain that tracks NVDA — not shares of NVIDIA Corporation, and holding CHIP does not confer ownership of NVIDIA shares. Nothing on this site is investment advice; token values can go to zero.
          Executions happen only when the core reaches its target and the configured executor acts; nothing is guaranteed.
        </p>
        <div className="flex items-center gap-3 md:shrink-0">
          <span className="label">Data</span>
          <ModeBadge placement="up" />
        </div>
      </div>
    </footer>
  );
}
