import type { Metadata } from "next";
import { DashboardPage } from "@/components/wallet/DashboardPage";

export const metadata: Metadata = { title: "Dashboard", description: "Your wallet against the chip: CHIP balance, share of supply, reserve exposure." };

export default function Page() {
  return <DashboardPage />;
}
