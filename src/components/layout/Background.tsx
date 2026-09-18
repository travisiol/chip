"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

/**
 * The fab: a faint engineering grid, a very faint PCB trace pattern, two
 * low-contrast wafer circles, soft radial lighting, grain, and a
 * pointer-driven highlight. All fixed, all behind the page, all quiet.
 */
export function Background() {
  const light = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let tx = x;
    let ty = y;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf = 0;
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      if (light.current) light.current.style.transform = `translate3d(${x - 400}px, ${y - 400}px, 0)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-void" />
      <div className="absolute inset-0 engineering-grid" />
      <PcbPattern />
      <WaferCircles />
      <div className="absolute -top-[30vh] left-1/2 h-[80vh] w-[90vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(229,234,236,0.055),rgba(229,234,236,0))]" />
      <div className="absolute -bottom-[40vh] left-1/2 h-[70vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(183,255,57,0.05),rgba(183,255,57,0))]" />
      <div ref={light} className="absolute top-0 left-0 h-[800px] w-[800px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.03),rgba(255,255,255,0))] will-change-transform" />
      <Ticks />
      <div className="absolute inset-0 grain" />
    </div>
  );
}

/** A sparse routing pattern: right-angle and 45° traces with via dots, tiled, barely there. */
function PcbPattern() {
  return (
    <svg className="absolute inset-0 h-full w-full text-aluminum/[0.05]" aria-hidden>
      <defs>
        <pattern id="pcb" width="320" height="320" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M12 40H96L128 72V150" />
            <path d="M200 20V88L232 120H300" />
            <path d="M40 300V236L72 204H140" />
            <path d="M260 300V212L292 180" />
            <path d="M160 160H196L220 184V250" />
          </g>
          <g fill="currentColor">
            <circle cx="12" cy="40" r="2" />
            <circle cx="128" cy="150" r="2" />
            <circle cx="200" cy="20" r="2" />
            <circle cx="300" cy="120" r="2" />
            <circle cx="40" cy="300" r="2" />
            <circle cx="140" cy="204" r="2" />
            <circle cx="292" cy="180" r="2" />
            <circle cx="160" cy="160" r="2" />
            <circle cx="220" cy="250" r="2" />
          </g>
        </pattern>
        <radialGradient id="pcb-fade" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="pcb-mask">
          <rect width="100%" height="100%" fill="url(#pcb-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#pcb)" mask="url(#pcb-mask)" />
    </svg>
  );
}

/** Two wafer outlines with their flats, far in the back. */
function WaferCircles() {
  return (
    <svg className="absolute inset-0 h-full w-full text-aluminum/[0.045]" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="82%" cy="18%" r="420" />
        <circle cx="82%" cy="18%" r="392" strokeDasharray="2 10" />
        <circle cx="12%" cy="88%" r="520" />
        <circle cx="12%" cy="88%" r="488" strokeDasharray="2 10" />
      </g>
    </svg>
  );
}

/** Measurement marks: a long tick every 100 px, a short one every 20. */
function Ticks() {
  return (
    <svg className="absolute top-0 left-4 hidden h-full w-6 text-aluminum/20 md:block" aria-hidden>
      <defs>
        <pattern id="ticks" width="24" height="100" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.5" x2="14" y2="0.5" stroke="currentColor" strokeWidth="1" />
          {[20, 40, 60, 80].map((y) => (
            <line key={y} x1="0" y1={y + 0.5} x2="6" y2={y + 0.5} stroke="currentColor" strokeWidth="1" />
          ))}
        </pattern>
      </defs>
      <rect width="24" height="100%" fill="url(#ticks)" />
    </svg>
  );
}
