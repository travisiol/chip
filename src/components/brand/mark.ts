/**
 * The CHIP symbol on a 32 × 32 grid: a square processor outline holding a C
 * made of sharp traces — the top run, the left run, the bottom run, each
 * joined by a 45° chamfer — a core block in the middle, and the core lead
 * leaving through the open side of the C. Four traces, one core.
 *
 * Everything that shows the mark (nav, favicon, OG image, intro) reads these
 * coordinates, so the symbol is identical at 16 px and at hero size.
 */
export const MARK = {
  viewBox: "0 0 32 32",
  /** The package outline. */
  body: { x: 3, y: 3, w: 26, h: 26, r: 3.5 },
  /** The C: three runs with chamfered joins, open to the right. */
  c: "M21.5 9.6H12.4L9.6 12.4V19.6L12.4 22.4H21.5",
  cWidth: 2.6,
  /** The core block. */
  core: { x: 14.1, y: 14.1, w: 3.8, h: 3.8 },
  /** The core lead: out of the core, through the opening, to the output edge. */
  lead: "M17.9 16H22.6",
  leadWidth: 1.7,
} as const;

/** Pin ticks around the body, for the large mark only (they vanish below ~48 px). */
export function markPins(perSide = 5): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const out: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const { body } = MARK;
  for (let i = 0; i < perSide; i++) {
    const t = body.x + body.r + ((body.w - 2 * body.r) * (i + 0.5)) / perSide;
    out.push({ x1: t, y1: body.y - 2.2, x2: t, y2: body.y - 0.2 });
    out.push({ x1: t, y1: body.y + body.h + 0.2, x2: t, y2: body.y + body.h + 2.2 });
    out.push({ x1: body.x - 2.2, y1: t, x2: body.x - 0.2, y2: t });
    out.push({ x1: body.x + body.w + 0.2, y1: t, x2: body.x + body.w + 2.2, y2: t });
  }
  return out;
}

export interface MarkColors {
  body: string;
  trace: string;
  core: string;
  background?: string;
}

/** A complete SVG document string — used for the favicon and anywhere a file is needed. */
export function markSvg(colors: MarkColors, opts: { size?: number; pins?: boolean; bodyStroke?: number; filledBody?: boolean } = {}): string {
  const { body, c, cWidth, core, lead, leadWidth, viewBox } = MARK;
  const size = opts.size ?? 32;
  const parts: string[] = [];
  if (colors.background) parts.push(`<rect width="32" height="32" rx="7" fill="${colors.background}"/>`);
  if (opts.filledBody) parts.push(`<rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" rx="${body.r}" fill="${colors.body}"/>`);
  else parts.push(`<rect x="${body.x}" y="${body.y}" width="${body.w}" height="${body.h}" rx="${body.r}" fill="none" stroke="${colors.body}" stroke-width="${opts.bodyStroke ?? 1.6}"/>`);
  if (opts.pins) for (const p of markPins()) parts.push(`<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${colors.body}" stroke-width="1.2" stroke-linecap="square"/>`);
  parts.push(`<path d="${c}" fill="none" stroke="${colors.trace}" stroke-width="${cWidth}" stroke-linecap="square" stroke-linejoin="miter"/>`);
  parts.push(`<path d="${lead}" fill="none" stroke="${colors.trace}" stroke-width="${leadWidth}" stroke-linecap="square"/>`);
  parts.push(`<rect x="${core.x}" y="${core.y}" width="${core.w}" height="${core.h}" rx="0.6" fill="${colors.core}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${parts.join("")}</svg>`;
}
