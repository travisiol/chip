"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** True once hydrated; false during SSR and the first client render. */
export const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** A media query as a subscription — no setState in an effect. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverValue);
}

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Phones and touch devices: lower DPR, fewer segments, no clearcoat. */
export const useLowQuality = () => useMediaQuery("(max-width: 767px), (pointer: coarse)");

/* A shared one-second clock: one interval for every "48m ago" on the page, 0 on the server. */
let nowCached = 0;
let nowTimer: ReturnType<typeof setInterval> | undefined;
const nowListeners = new Set<() => void>();
function subscribeNow(cb: () => void) {
  nowListeners.add(cb);
  if (!nowTimer) {
    nowCached = Date.now();
    nowTimer = setInterval(() => {
      nowCached = Date.now();
      nowListeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    nowListeners.delete(cb);
    if (nowListeners.size === 0 && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = undefined;
    }
  };
}
export const useNow = () =>
  useSyncExternalStore(
    subscribeNow,
    () => nowCached || (nowCached = Date.now()),
    () => 0,
  );

/**
 * Exponential smoothing toward `target`, driven by requestAnimationFrame.
 * Numbers never jump: 82.1 → 83.9 glides. `rate` is the approach speed per second.
 */
export function useSmoothNumber(target: number, rate = 6, snapBelow = 0.0005): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const targetRef = useRef(target);
  const raf = useRef<number | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    targetRef.current = target;
    // The first real value after mount (the store filling in) is shown at once — no glide from zero.
    if (!settled.current && target !== 0) {
      settled.current = true;
      if (current.current === 0) {
        current.current = target;
        setValue(target);
        return;
      }
    }
    if (raf.current !== null) return;
    let last: number | null = null;
    const tick = (t: number) => {
      // Clocks can disagree (virtual time, throttled tabs): never step backwards; a long gap counts as a quarter second so a throttled tab still converges.
      const raw = last === null ? 1 / 60 : (t - last) / 1000;
      const dt = raw > 0 ? Math.min(raw, 0.25) : 1 / 60;
      last = t;
      const diff = targetRef.current - current.current;
      if (Math.abs(diff) <= snapBelow * Math.max(1, Math.abs(targetRef.current))) {
        current.current = targetRef.current;
        setValue(current.current);
        raf.current = null;
        return;
      }
      current.current += diff * (1 - Math.exp(-dt * rate));
      setValue(current.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [target, rate, snapBelow]);

  return value;
}

/** Whether an element is in (or near) the viewport — used to pause WebGL scenes that scrolled away. */
export function useInView<T extends Element>(margin = "200px"): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView];
}

/** Window scroll position past a threshold, as a subscription. */
export function useScrolledPast(px: number): boolean {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("scroll", cb, { passive: true });
    return () => window.removeEventListener("scroll", cb);
  }, []);
  return useSyncExternalStore(subscribe, () => window.scrollY > px, () => false);
}
