import type { Metadata } from "next";
import { ActivityPage } from "@/components/activity/ActivityPage";

export const metadata: Metadata = { title: "Activity", description: "Live core activity: inputs, power checkpoints, executions, cycles." };

export default function Page() {
  return <ActivityPage />;
}
