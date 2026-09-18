const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (min: number, max: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
const n0 = num(0, 0);
const n2 = num(2, 2);
const n4 = num(2, 4);

/** $18,482.14 — the default money format. */
export const fmtUsd = (v: number | null | undefined, digits: 0 | 2 = 2): string => (v == null || !Number.isFinite(v) ? "—" : digits === 0 ? usd0.format(v) : usd2.format(v));

/** 17.32 NVDA — token amounts with up to 4 decimals. */
export const fmtAmount = (v: number | null | undefined, digits: 2 | 4 = 2): string => (v == null || !Number.isFinite(v) ? "—" : (digits === 2 ? n2 : n4).format(v));

export const fmtInt = (v: number | null | undefined): string => (v == null || !Number.isFinite(v) ? "—" : n0.format(v));

/** 82.1% */
export const fmtPct = (v: number | null | undefined, digits = 1): string => (v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)}%`);

/** 0.0021 ETH with sensible precision. */
export const fmtEth = (v: number | null | undefined): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v === 0) return "0 ETH";
  if (v < 0.0001) return "<0.0001 ETH";
  return `${num(0, v < 1 ? 4 : 3).format(v)} ETH`;
};

/** #024 */
export const fmtCycle = (n: number): string => `#${String(n).padStart(3, "0")}`;

export const shortAddress = (a: string, head = 6, tail = 4): string => (a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);

export const shortHash = (h: string): string => `${h.slice(0, 6)}…${h.slice(-3)}`;

/** 12:41:18 — local wall clock, 24 h. */
export const fmtClock = (ms: number): string => new Date(ms).toLocaleTimeString("en-GB", { hour12: false });

export const fmtDate = (ms: number): string => new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });

export const fmtDateTime = (ms: number): string => `${fmtDate(ms)} ${fmtClock(ms)}`;

/** 8s ago / 48m ago / 3h ago / 2d ago. */
export function fmtAgo(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** 03h 41m */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${String(m).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
  if (h < 100) return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
