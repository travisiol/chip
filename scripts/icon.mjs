// Regenerates app/icon.svg (favicon) and public/mark.svg from the brand generator.
// usage: node scripts/icon.mjs
import { writeFileSync } from "node:fs";
import { markSvg } from "../src/components/brand/mark.ts";

writeFileSync("src/app/icon.svg", markSvg({ background: "#0A0C0D", body: "#B8C0C4", trace: "#B7FF39", core: "#F4F6F5" }, { size: 32, filledBody: false, bodyStroke: 1.4 }));
writeFileSync("public/mark.svg", markSvg({ body: "#E5EAEC", trace: "#B7FF39", core: "#F4F6F5" }, { size: 512, pins: true, bodyStroke: 1.2 }));
writeFileSync("public/mark-x.svg", markSvg({ background: "#050606", body: "#B8C0C4", trace: "#B7FF39", core: "#F4F6F5" }, { size: 400, bodyStroke: 1.4 }));
console.log("icon.svg, mark.svg, mark-x.svg written");
