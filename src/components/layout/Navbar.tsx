"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChipMark } from "@/components/brand/ChipMark";
import { XLink } from "@/components/ui/XLink";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useScrolledPast } from "@/lib/hooks";

const LINKS = [
  { href: "/#core", label: "Core", match: "/" },
  { href: "/reserve", label: "Reserve", match: "/reserve" },
  { href: "/activity", label: "Activity", match: "/activity" },
  { href: "/#transparency", label: "Transparency", match: "/transparency" },
];

/**
 * Transparent over the hero, then a dark translucent bar with blur and a
 * one-pixel graphite border once the page has scrolled.
 */
export function Navbar() {
  const scrolled = useScrolledPast(24);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[80] transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled || open ? "border-b border-graphite bg-void/75 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CHIP home" onClick={() => setOpen(false)}>
          <ChipMark size={26} className="text-ink" />
          <span className="display-wide text-[15px] tracking-[0.18em]">CHIP</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link" aria-current={pathname === l.match ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <XLink />
          <ConnectButton />
          <button type="button" className="btn btn-ghost btn-sm !px-2 md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-graphite bg-void/95 px-5 py-4 md:hidden" aria-label="Primary mobile">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="nav-link block py-3 text-sm" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/dashboard" className="nav-link block py-3 text-sm" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
