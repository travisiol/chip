/**
 * Per-frame signals shared between the page (HTML) and the WebGL scenes,
 * outside React so nothing re-renders at pointer speed.
 */
export const signals = {
  /** Pointer in [-1, 1] over the viewport. */
  mouseX: 0,
  mouseY: 0,
  /** True while TRADE CHIP is hovered — the chip reacts slightly. */
  hover: false,
  /** Which core-map region is hovered, if any (the 3D chip highlights it too). */
  region: null as null | "input" | "processing" | "core" | "execution" | "output",
};

let bound = false;
/** Idempotent: binds the pointer listener once per page. */
export function bindPointer() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      signals.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      signals.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );
}

/** Pointer state for the reserve stack, outside React (one stack is visible at a time). */
export const stackInput = {
  active: false,
  lastX: 0,
  yaw: 0,
  /** Cycle id hovered in the HTML list, mirrored on the 3D stack (and vice versa). */
  hoverCycle: null as number | null,
};

/* Setters — components write through these (the React Compiler forbids assigning module variables from a component). */
export const setRegion = (r: typeof signals.region) => {
  signals.region = r;
};
export const setHover = (on: boolean) => {
  signals.hover = on;
};
export const setHoverCycle = (cycle: number | null) => {
  stackInput.hoverCycle = cycle;
};
export const clearHoverCycle = (cycle: number) => {
  if (stackInput.hoverCycle === cycle) stackInput.hoverCycle = null;
};

/** Drag-to-turn for the stack, kept outside React. */
const drag = { down: false, x: 0 };
export const stackDrag = {
  start(x: number) {
    drag.down = true;
    drag.x = x;
    stackInput.active = true;
  },
  move(x: number) {
    if (!drag.down) return;
    stackInput.yaw += (x - drag.x) * 0.008;
    drag.x = x;
  },
  end() {
    drag.down = false;
    stackInput.active = false;
  },
};
