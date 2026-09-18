import { ActivitySection } from "@/components/activity/ActivitySection";
import { CoreMap } from "@/components/landing/CoreMap";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TransparencySection } from "@/components/landing/TransparencySection";
import { ReserveSection } from "@/components/reserve/ReserveSection";

/**
 * The scroll story: the chip powers up → the signal travels through the
 * process → into the architecture → out to the completed cycles → the live
 * events → the contracts → power the core.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="hairline mx-auto max-w-[1200px]" />
      <HowItWorks />
      <CoreMap />
      <ReserveSection />
      <ActivitySection />
      <TransparencySection />
      <FinalCta />
    </>
  );
}
