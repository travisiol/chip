// The signature moment as a strip of frames. The QA hook (dev builds only) pushes the
// charge to 97 %, then plays a purchase; an in-page recorder grabs the WebGL canvas every
// 250 ms (toDataURL; the dev build preserves the drawing buffer) together with the
// store phase and the HUD text, through full → purchasing → confirmed → resetting →
// new cycle. Real time over CDP; the frames are laid out on one contact sheet.
// usage: node scripts/signature-strip.mjs [baseUrl]  → docs/captures/signature.png
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const base = process.argv[2] ?? "http://localhost:3713";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const out = path.resolve("docs/captures");
mkdirSync(path.join(out, "sig"), { recursive: true });
const b = await launch({ width: 1440, height: 900 });
let frames = [];
let log = [];
try {
  await b.navigate(`${base}/?intro=0`);
  await b.waitFor(`!!document.querySelector('#chip canvas') && !!window.__chip && !!window.__chipScene`, "hero canvas + dev hooks");
  await sleep(3000);
  await b.evaluate(`
    window.__phaseLog = [[Date.now(), window.__chip.store.getState().chip.status]];
    window.__chip.store.subscribe((s, prev) => { if (s.chip.status !== prev.chip.status) window.__phaseLog.push([Date.now(), s.chip.status]); });
    window.__rec = [];
    window.__recTimer = setInterval(() => {
      const st = window.__chip.store.getState();
      const hud = document.querySelector('#chip [role="status"]')?.innerText.replace(/\\s+/g, ' ').trim() ?? '';
      window.__rec.push({ t: Date.now(), img: window.__chipScene.gl.domElement.toDataURL('image/jpeg', 0.8), phase: st.chip.status, pct: st.chip.corePowerPercent, cycle: st.chip.currentCycle, reserve: st.reserve.reserveValueUsd, hud });
    }, 250);
    window.__startCycle = window.__chip.store.getState().chip.currentCycle;
    window.__chip.qa.fill(96);
    setTimeout(() => window.__chip.qa.execute(), 2200);
  `);
  await b.waitFor(`(() => { const s = window.__chip.store.getState(); return s.chip.status === 'POWERING' && s.chip.currentCycle === window.__startCycle + 1; })()`, "next cycle", 90_000);
  await sleep(1200);
  await b.evaluate(`clearInterval(window.__recTimer)`);
  log = await b.evaluate(`window.__phaseLog`);
  const rec = await b.evaluate(`window.__rec`);
  const t0 = rec[0].t;
  frames = rec.map((f, i) => {
    const file = path.join(out, "sig", `frame-${String(i).padStart(3, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.img.split(",")[1], "base64"));
    return { ...f, file, rel: (f.t - t0) / 1000 };
  });
} finally {
  b.close();
}

const t00 = log[0][0];
console.log("phase transitions:", log.map(([t, ph]) => `${((t - t00) / 1000).toFixed(2)}s ${ph}`).join(" → "));
console.log(`${frames.length} frames over ${frames[frames.length - 1].rel.toFixed(1)}s`);
const phases = log.map(([, ph]) => ph);
for (const need of ["FULL", "EXECUTING", "CONFIRMED", "RESETTING", "POWERING"]) if (!phases.includes(need)) throw new Error(`sequence incomplete: ${phases.join(",")}`);
if (frames[frames.length - 1].cycle !== frames[0].cycle + 1) throw new Error("did not reach the next cycle");

// Contact sheet: the frames around the transitions, 6 per row.
const first = frames.findIndex((f) => f.phase !== "POWERING");
const picked = frames.slice(Math.max(0, first - 2)).filter((_, i) => i % 2 === 0).slice(0, 30);
const sheet = path.join(out, "signature-sheet.html");
writeFileSync(
  sheet,
  `<!doctype html><body style="margin:0;background:#050606;padding:12px;display:grid;grid-template-columns:repeat(6,1fr);gap:10px;font:11px monospace;color:#b8c0c4">${picked
    .map(
      (f) =>
        `<figure style="margin:0"><img src="${pathToFileURL(f.file).href}" style="width:100%;display:block;border:1px solid #1c2124"><figcaption style="padding:4px 2px;line-height:1.4">${f.rel.toFixed(2)}s · <b style="color:#f4f6f5">${f.phase}</b> · ${f.pct.toFixed(1)}% · cycle ${f.cycle}<br><span style="color:#7c8587">${f.hud || "&nbsp;"}</span><br><span style="color:#7c8587">reserve $${Math.round(f.reserve ?? 0)}</span></figcaption></figure>`,
    )
    .join("")}</body>`,
);
const rows = Math.ceil(picked.length / 6);
const r = spawnSync(chrome, ["--headless=new", "--no-first-run", `--user-data-dir=${path.join(process.env.TEMP ?? "/tmp", "chip-shot")}`, "--hide-scrollbars", `--window-size=1460,${rows * 375 + 30}`, "--virtual-time-budget=5000", `--screenshot=${path.join(out, "signature.png")}`, pathToFileURL(sheet).href], { stdio: "ignore", timeout: 120_000 });
console.log(r.status === 0 ? "sheet ok docs/captures/signature.png" : "sheet failed");
