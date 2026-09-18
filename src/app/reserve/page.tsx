import type { Metadata } from "next";
import { ReservePage } from "@/components/reserve/ReservePage";

export const metadata: Metadata = { title: "Reserve", description: "The NVDA-linked reserve, built one cycle at a time." };

export default function Page() {
  return <ReservePage />;
}
