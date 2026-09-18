// Headless Chrome captures of the site (WebGL through SwiftShader, no GPU needed).
// usage: node scripts/capture.mjs [baseUrl] [only]   → docs/captures/*.png
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.argv[2] ?? "http://localhost:3713";
const only = process.argv[3];
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const out = path.resolve("docs/captures");
mkdirSync(out, { recursive: true });

const shots = [
  { name: "home", url: "/?intro=0", w: 1440, h: 900, budget: 16000 },
  { name: "home-full", url: "/?intro=0", w: 1440, h: 5200, budget: 22000 },
  { name: "reserve", url: "/reserve?intro=0", w: 1440, h: 1700, budget: 14000 },
  { name: "activity", url: "/activity?intro=0", w: 1440, h: 1200, budget: 12000 },
  { name: "dashboard", url: "/dashboard?intro=0", w: 1440, h: 900, budget: 10000 },
];

// Phones: Chrome refuses windows narrower than ~500 px, so 390 px iframes side by side.
const phoneRoutes = ["/?intro=0", "/reserve?intro=0", "/activity?intro=0", "/dashboard?intro=0"];
const harness = path.join(out, "mobile-harness.html");
writeFileSync(
  harness,
  `<!doctype html><body style="margin:0;background:#050606;display:flex;gap:16px;padding:16px">${phoneRoutes
    .map((r) => `<iframe src="${base}${r}" width="390" height="844" style="border:1px solid #1c2124;border-radius:24px;background:#050606"></iframe>`)
    .join("")}</body>`,
);
shots.push({ name: "mobile", url: null, file: harness, w: 1660, h: 880, budget: 22000 });

for (const s of shots) {
  if (only && s.name !== only) continue;
  const file = path.join(out, `${s.name}.png`);
  const args = [
    "--headless=new",
    "--no-first-run",
    `--user-data-dir=${path.join(process.env.TEMP ?? "/tmp", "chip-shot")}`,
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--hide-scrollbars",
    `--window-size=${s.w},${s.h}`,
    `--virtual-time-budget=${s.budget}`,
    `--screenshot=${file}`,
    s.url === null ? pathToFileURL(s.file).href : `${base}${s.url}`,
  ];
  const r = spawnSync(chrome, args, { stdio: "ignore", timeout: 180_000 });
  console.log(r.status === 0 ? "ok  " : "fail", s.name, file);
}
