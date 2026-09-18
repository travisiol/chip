import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { chipConfig } from "@/config/chip";
import { Providers } from "@/components/Providers";
import { Background } from "@/components/layout/Background";
import { Footer } from "@/components/layout/Footer";
import { Intro } from "@/components/layout/Intro";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/layout/Toaster";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", weight: ["400", "500", "600", "700"], display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: ["400", "500"], display: "swap" });

const TITLE = "CHIP — Trade. Power. Build NVDA.";
const DESCRIPTION = "Every trade powers the chip. CHIP is a Robinhood Chain token whose trading fees power a semiconductor core; at 100 %, the system executes an NVDA Stock Token purchase and the NVDA-linked reserve grows.";

export const metadata: Metadata = {
  metadataBase: new URL(chipConfig.site.url),
  title: { default: TITLE, template: "%s · CHIP" },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: "Every trade powers the chip.", siteName: "CHIP", type: "website" },
  twitter: { card: "summary_large_image", site: "@Chip_nvid", title: TITLE, description: "Every trade powers the chip." },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#050606", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-svh">
        <Providers>
          <Background />
          <Intro />
          <Navbar />
          <main className="relative z-[2]">{children}</main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
