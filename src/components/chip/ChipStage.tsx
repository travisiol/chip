"use client";

import dynamic from "next/dynamic";
import { SceneBoundary } from "@/components/ui/SceneBoundary";
import { ChipFallback } from "./ChipFallback";
import { ChipHud } from "./ChipHud";
import { CoreInput } from "./CoreInput";

const ChipScene = dynamic(() => import("./ChipScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center p-[8%]">
      <ChipFallback dim />
    </div>
  ),
});

/**
 * The chip with its words and its input popups. The WebGL scene loads
 * lazily; until then (and if WebGL fails) the SVG chip stands in with the
 * same power level.
 */
export function ChipStage({ className = "", hud = true }: { className?: string; hud?: boolean }) {
  return (
    <div id="chip" className={`relative ${className}`}>
      <SceneBoundary
        fallback={
          <div className="flex h-full w-full items-center justify-center p-[8%]">
            <ChipFallback />
          </div>
        }
      >
        <ChipScene className="h-full w-full" />
      </SceneBoundary>
      <CoreInput />
      {hud ? <ChipHud /> : null}
    </div>
  );
}
