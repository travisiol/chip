import { mulberry32 } from "./prng";

/**
 * The chip's circuit network, in die space: a square from −1 to 1, the core in
 * the middle, pins on the edges. Everything that draws the chip — the WebGL
 * scene, the SVG fallback, the core map, the intro — reads this one network,
 * so a signal takes the same route everywhere.
 *
 *   ┌──────────────── pins (input bus) ────────────────┐
 *   │  fan-out traces  ──▶  ring bus  ──▶  core leads  │  ──▶ execution bus ──▶ reserve output (right edge)
 *   └──────────────────────────────────────────────────┘
 *
 * Sides: 0 = top, 1 = right, 2 = bottom, 3 = left. The right side is the
 * output: its traces carry the execution out of the core instead of fees in.
 */

export interface Pt {
  x: number;
  y: number;
}

/** 0 fee trace (pin → ring), 1 ring bus, 2 core lead (ring → core), 3 execution bus (core → right edge). */
export type TraceKind = 0 | 1 | 2 | 3;

export interface Trace {
  id: number;
  kind: TraceKind;
  side: 0 | 1 | 2 | 3;
  /** Pin index along its side (fee and execution traces). */
  pin: number;
  /** Polyline in die space, from the outside in (or, for the execution bus, from the core out). */
  points: Pt[];
  /** Power level (0–1) at which this trace starts lighting, and how much power it takes to light fully. */
  offset: number;
  span: number;
  /** Relative width; 1 is a signal trace. */
  width: number;
  /** Cumulative length at each point; the last entry is the total. */
  cumulative: number[];
}

/** A complete route for a signal packet: pin → fan-out → along the ring → core lead → core edge. */
export interface SignalPath {
  pin: number;
  points: Pt[];
  cumulative: number[];
}

export interface TraceNetwork {
  pinsPerSide: number;
  /** Half-size of the core block. */
  core: number;
  /** Half-size of the ring bus. */
  ring: number;
  traces: Trace[];
  /** Decorative via dots at the bends. */
  vias: Pt[];
  /** One route per input pin (sides 0, 2, 3), indexed like `inputPins`. */
  signalPaths: SignalPath[];
  /** Routes the execution takes out of the core (right side). */
  executionPaths: SignalPath[];
  /** Pin positions in die space for every side, for drawing the package. */
  pins: Array<{ side: 0 | 1 | 2 | 3; index: number; at: Pt; dir: Pt }>;
}

export interface NetworkOptions {
  pinsPerSide?: number;
  seed?: number;
  core?: number;
  ring?: number;
}

const CORE = 0.3;
const RING = 0.54;
const EDGE = 1.0;
/** Where the outermost pin sits along an edge. */
const PIN_SPREAD = 0.82;
/** Core leads leave the ring at these positions (fraction of the ring half-size). */
const LEAD_POSITIONS = [-0.4, 0, 0.4];

const rotate = (p: Pt, side: number): Pt => {
  switch (side) {
    case 1:
      return { x: p.y, y: -p.x };
    case 2:
      return { x: -p.x, y: -p.y };
    case 3:
      return { x: -p.y, y: p.x };
    default:
      return { x: p.x, y: p.y };
  }
};

export function cumulativeLengths(points: Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  return out;
}

/** Position and direction at fraction `t` (0–1) along a polyline. */
export function pointAt(path: { points: Pt[]; cumulative: number[] }, t: number): { x: number; y: number; dx: number; dy: number } {
  const { points, cumulative } = path;
  const total = cumulative[cumulative.length - 1];
  const d = Math.min(Math.max(t, 0), 1) * total;
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < d) i++;
  const a = points[i - 1];
  const b = points[i];
  const segLen = cumulative[i] - cumulative[i - 1] || 1;
  const u = (d - cumulative[i - 1]) / segLen;
  const dx = (b.x - a.x) / segLen;
  const dy = (b.y - a.y) / segLen;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dx, dy };
}

/** The ring bus as a closed polyline with chamfered corners, starting at the top-left, clockwise. */
function ringPolyline(r: number, chamfer: number): Pt[] {
  return [
    { x: -r + chamfer, y: r },
    { x: r - chamfer, y: r },
    { x: r, y: r - chamfer },
    { x: r, y: -r + chamfer },
    { x: r - chamfer, y: -r },
    { x: -r + chamfer, y: -r },
    { x: -r, y: -r + chamfer },
    { x: -r, y: r - chamfer },
    { x: -r + chamfer, y: r },
  ];
}

export function buildTraceNetwork(opts: NetworkOptions = {}): TraceNetwork {
  const pinsPerSide = opts.pinsPerSide ?? 9;
  const core = opts.core ?? CORE;
  const ring = opts.ring ?? RING;
  const rng = mulberry32(opts.seed ?? 7);
  const traces: Trace[] = [];
  const vias: Pt[] = [];
  const signalPaths: SignalPath[] = [];
  const executionPaths: SignalPath[] = [];
  const pins: TraceNetwork["pins"] = [];
  let id = 0;

  const pinU = (i: number) => (pinsPerSide === 1 ? 0 : -PIN_SPREAD + (i * 2 * PIN_SPREAD) / (pinsPerSide - 1));

  // Core leads: three per side, ring → core. Lit late (they carry the converging signal).
  const leads: Record<number, Pt[][]> = { 0: [], 1: [], 2: [], 3: [] };
  for (const side of [0, 1, 2, 3] as const) {
    for (const f of LEAD_POSITIONS) {
      const pts = [
        { x: f * ring, y: ring },
        { x: f * ring, y: core },
      ].map((p) => rotate(p, side));
      leads[side].push(pts);
      traces.push({ id: id++, kind: 2, side, pin: -1, points: pts, offset: 0.72, span: 0.24, width: 1.6, cumulative: cumulativeLengths(pts) });
    }
  }

  // The ring bus: one closed trace, lit through the middle of the range.
  const ringPts = ringPolyline(ring, 0.07);
  traces.push({ id: id++, kind: 1, side: 0, pin: -1, points: ringPts, offset: 0.42, span: 0.3, width: 1.5, cumulative: cumulativeLengths(ringPts) });

  // Fee traces on the three input sides: pin → straight in → 45° → straight to the ring.
  for (const side of [0, 2, 3] as const) {
    for (let i = 0; i < pinsPerSide; i++) {
      const u = pinU(i);
      const v = (u * (ring - 0.09)) / PIN_SPREAD;
      const diag = Math.abs(u - v);
      const maxA = EDGE - ring - 0.05 - diag;
      const a = Math.max(0.05, Math.min(0.09 + rng() * 0.3, maxA));
      const local: Pt[] = [
        { x: u, y: EDGE },
        { x: u, y: EDGE - a },
        { x: v, y: EDGE - a - diag },
        { x: v, y: ring },
      ];
      // Drop the diagonal for the pins that sit right above their landing point.
      const pts = (diag < 0.012 ? [local[0], local[3]] : local).map((p) => rotate(p, side));
      const centre = 1 - Math.abs(u) / PIN_SPREAD; // outer pins light first
      const offset = Math.min(0.5, 0.02 + centre * 0.36 + rng() * 0.1);
      const width = i % 4 === 1 ? 1.4 : 1;
      traces.push({ id: id++, kind: 0, side, pin: i, points: pts, offset, span: 0.3, width, cumulative: cumulativeLengths(pts) });
      if (pts.length === 4) vias.push(pts[1], pts[2]);
      pins.push({ side, index: i, at: rotate({ x: u, y: EDGE }, side), dir: rotate({ x: 0, y: 1 }, side) });

      // The packet route: the fee trace, then along the ring's edge to the nearest lead, then the lead into the core.
      const leadF = LEAD_POSITIONS.reduce((best, f) => (Math.abs(f * ring - v) < Math.abs(best * ring - v) ? f : best), LEAD_POSITIONS[0]);
      const route: Pt[] = [...local, { x: leadF * ring, y: ring }, { x: leadF * ring, y: core }, { x: leadF * ring * 0.35, y: core * 0.35 }].map((p) => rotate(p, side));
      const cleaned = route.filter((p, k) => k === 0 || Math.hypot(p.x - route[k - 1].x, p.y - route[k - 1].y) > 1e-6);
      signalPaths.push({ pin: signalPaths.length, points: cleaned, cumulative: cumulativeLengths(cleaned) });
    }
  }

  // The execution bus on the right: wide traces from the core, 45° out to a pin lane, straight to the reserve output pins.
  const busPins = pinsPerSide >= 8 ? 5 : 3;
  const firstBusPin = Math.floor((pinsPerSide - busPins) / 2);
  const outerU = pinU(firstBusPin + busPins - 1) || 1;
  for (let i = 0; i < busPins; i++) {
    const k = firstBusPin + i;
    const u = pinU(k);
    const xc = (u / outerU) * core * 0.85;
    const local: Pt[] = [
      { x: xc, y: core },
      { x: xc, y: ring - 0.02 },
      { x: u, y: ring - 0.02 + Math.abs(u - xc) },
      { x: u, y: EDGE },
    ];
    const dedup = local.filter((p, j) => j === 0 || Math.hypot(p.x - local[j - 1].x, p.y - local[j - 1].y) > 1e-6);
    const pts = dedup.map((p) => rotate(p, 1));
    traces.push({ id: id++, kind: 3, side: 1, pin: k, points: pts, offset: 1, span: 1, width: 1.9, cumulative: cumulativeLengths(pts) });
    if (pts.length === 4) vias.push(pts[1], pts[2]);
    executionPaths.push({ pin: k, points: pts, cumulative: cumulativeLengths(pts) });
  }
  for (let i = 0; i < pinsPerSide; i++) pins.push({ side: 1, index: i, at: rotate({ x: pinU(i), y: EDGE }, 1), dir: rotate({ x: 0, y: 1 }, 1) });

  for (const c of ringPts.slice(0, -1)) vias.push(c);

  return { pinsPerSide, core, ring, traces, vias, signalPaths, executionPaths, pins };
}

/** The fraction (0–1) of a trace that is lit at a given power level, 0–1. */
export function litFraction(trace: Pick<Trace, "offset" | "span" | "kind">, power: number): number {
  if (trace.kind === 3) return 0;
  return Math.min(1, Math.max(0, (power - trace.offset) / trace.span));
}

/** SVG path data for a polyline. */
export const toPathData = (points: Pt[], scale = 1, cx = 0, cy = 0) => points.map((p, i) => `${i === 0 ? "M" : "L"}${(cx + p.x * scale).toFixed(2)} ${(cy - p.y * scale).toFixed(2)}`).join(" ");

let shared: TraceNetwork | null = null;
/** The network every component shares (desktop density). */
export function traceNetwork(): TraceNetwork {
  if (!shared) shared = buildTraceNetwork();
  return shared;
}
