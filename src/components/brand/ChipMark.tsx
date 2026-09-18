import { MARK, markPins } from "./mark";

interface Props {
  size?: number;
  /** Light the traces in energy green; otherwise the whole mark is currentColor. */
  energy?: boolean;
  /** Draw the pin ticks (large usage only). */
  pins?: boolean;
  className?: string;
  title?: string;
}

/** The CHIP symbol. Inline SVG, currentColor for the package, energy green for the circuit. */
export function ChipMark({ size = 24, energy = true, pins = false, className = "", title }: Props) {
  const { body, c, cWidth, core, lead, leadWidth, viewBox } = MARK;
  const trace = energy ? "var(--color-energy)" : "currentColor";
  return (
    <svg width={size} height={size} viewBox={viewBox} className={className} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={body.r} fill="none" stroke="currentColor" strokeWidth={1.6} />
      {pins ? markPins().map((p, i) => <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="currentColor" strokeWidth={1.2} strokeLinecap="square" opacity={0.7} />) : null}
      <path d={c} fill="none" stroke={trace} strokeWidth={cWidth} strokeLinecap="square" strokeLinejoin="miter" />
      <path d={lead} fill="none" stroke={trace} strokeWidth={leadWidth} strokeLinecap="square" />
      <rect x={core.x} y={core.y} width={core.w} height={core.h} rx={0.6} fill="currentColor" />
    </svg>
  );
}
