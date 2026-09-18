"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Client-only: the decision to play reads localStorage and the motion preference.
const IntroOverlay = dynamic(() => import("./IntroOverlay"), { ssr: false });

/** The opening plays on the landing only — a deep link goes straight to its page. */
export function Intro() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <IntroOverlay />;
}
