import * as THREE from "three";
import { mulberry32 } from "@/lib/chip/prng";
import type { Pt, TraceNetwork } from "@/lib/chip/traces";

/** Die-space → world: x stays, north (+y) goes away from the camera (−z). */
export const toWorld = (p: Pt, scale: number, y = 0): [number, number, number] => [p.x * scale, y, -p.y * scale];

/**
 * Every trace as a flat ribbon lying on the die, merged into one geometry.
 * Segments are extended by half a width at both ends so 45° joins close;
 * the via dots cover what is left. Attributes: aT along the trace, aOffset /
 * aSpan / aKind per trace, aRand per trace.
 */
export function buildTraceGeometry(net: TraceNetwork, scale: number, y: number, baseWidth: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const aT: number[] = [];
  const aOffset: number[] = [];
  const aSpan: number[] = [];
  const aKind: number[] = [];
  const aRand: number[] = [];
  const index: number[] = [];
  const rng = mulberry32(11);

  for (const trace of net.traces) {
    const rand = rng();
    const w = baseWidth * trace.width;
    const total = trace.cumulative[trace.cumulative.length - 1] || 1;
    for (let i = 1; i < trace.points.length; i++) {
      const a = trace.points[i - 1];
      const b = trace.points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      // Normal in die space.
      const nx = -uy;
      const ny = ux;
      const ext = w / scale / 2;
      const isRing = trace.kind === 1;
      const a2 = { x: a.x - ux * ext * (isRing ? 1 : i === 1 ? 0.4 : 1), y: a.y - uy * ext * (isRing ? 1 : i === 1 ? 0.4 : 1) };
      const b2 = { x: b.x + ux * ext, y: b.y + uy * ext };
      const tA = trace.cumulative[i - 1] / total;
      const tB = trace.cumulative[i] / total;
      const half = w / 2 / scale;
      const corners: Array<[Pt, number]> = [
        [{ x: a2.x + nx * half, y: a2.y + ny * half }, tA],
        [{ x: a2.x - nx * half, y: a2.y - ny * half }, tA],
        [{ x: b2.x - nx * half, y: b2.y - ny * half }, tB],
        [{ x: b2.x + nx * half, y: b2.y + ny * half }, tB],
      ];
      const base = positions.length / 3;
      for (const [p, t] of corners) {
        positions.push(...toWorld(p, scale, y));
        aT.push(t);
        aOffset.push(trace.offset);
        aSpan.push(trace.span);
        aKind.push(trace.kind);
        aRand.push(rand);
      }
      // Counter-clockwise seen from above (+y), so the ribbons face the camera.
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  geo.setAttribute("aOffset", new THREE.Float32BufferAttribute(aOffset, 1));
  geo.setAttribute("aSpan", new THREE.Float32BufferAttribute(aSpan, 1));
  geo.setAttribute("aKind", new THREE.Float32BufferAttribute(aKind, 1));
  geo.setAttribute("aRand", new THREE.Float32BufferAttribute(aRand, 1));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

/** A square ring (the brushed frame around the die), extruded along +y. */
export function buildFrameGeometry(outer: number, inner: number, height: number, bevel: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-outer, -outer);
  shape.lineTo(outer, -outer);
  shape.lineTo(outer, outer);
  shape.lineTo(-outer, outer);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-inner, -inner);
  hole.lineTo(-inner, inner);
  hole.lineTo(inner, inner);
  hole.lineTo(inner, -inner);
  hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** The die surface: a fine silicon grid with faint rectangular blocks, painted at runtime (no asset). */
export function makeDieTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0b0e10";
    ctx.fillRect(0, 0, size, size);
    const rng = mulberry32(3);
    // Blocks: the standard cells of a die, barely lighter than the substrate.
    for (let i = 0; i < 140; i++) {
      const w = 20 + rng() * 120;
      const h = 12 + rng() * 60;
      const x = rng() * (size - w);
      const y = rng() * (size - h);
      ctx.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.035})`;
      ctx.fillRect(x, y, w, h);
    }
    // Fine grid.
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    const step = size / 48;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      ctx.moveTo(i * step + 0.5, 0);
      ctx.lineTo(i * step + 0.5, size);
      ctx.moveTo(0, i * step + 0.5);
      ctx.lineTo(size, i * step + 0.5);
    }
    ctx.stroke();
    // Coarser grid.
    ctx.strokeStyle = "rgba(255,255,255,0.11)";
    ctx.beginPath();
    const big = size / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.moveTo(i * big + 0.5, 0);
      ctx.lineTo(i * big + 0.5, size);
      ctx.moveTo(0, i * big + 0.5);
      ctx.lineTo(size, i * big + 0.5);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Radial gradient for the pool of light around the core; fully transparent well inside the plane. */
export function makeGlowTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(183,255,57,0.5)");
    g.addColorStop(0.35, "rgba(183,255,57,0.16)");
    g.addColorStop(0.7, "rgba(183,255,57,0.02)");
    g.addColorStop(1, "rgba(183,255,57,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Alpha mask for the floor: opaque in the middle, gone at 45 % of the plane — the pool must vanish inside the frustum. */
export function makeFadeTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.2, "#a0a0a0");
    g.addColorStop(0.38, "#202020");
    g.addColorStop(0.46, "#000000");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}
