// One-off script: produces the 12 face-card WebPs in src/assets/cards/.
// Downloads the source SVGs from Byron Knoll's public-domain deck (hosted by
// notpeter/Vector-Playing-Cards on GitHub) if they're not already in raw/,
// then resizes + encodes them as WebP at the largest size we display at 2x
// (148px × 2 = 296px → 320px for headroom).
//
// Source attribution: cards by Byron Knoll, public domain (or WTFPL).
//   https://github.com/notpeter/Vector-Playing-Cards
//
// Run with: node scripts/build-face-cards.mjs

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC_RAW = "src/assets/cards/raw";
const OUT = "src/assets/cards";
const WIDTH = 320;
const BASE_URL = "https://raw.githubusercontent.com/notpeter/Vector-Playing-Cards/master/cards-svg";

const ranks = ["J", "Q", "K"];
const suits = ["S", "H", "D", "C"];

await mkdir(SRC_RAW, { recursive: true });
await mkdir(OUT, { recursive: true });

let totalBytes = 0;
for (const rank of ranks) {
  for (const suit of suits) {
    const name = `${rank}${suit}`;
    const rawPath = join(SRC_RAW, `${name}.svg`);
    const outPath = join(OUT, `${name}.webp`);
    let svg;
    try {
      svg = await readFile(rawPath);
    } catch {
      // Not cached locally — fetch from upstream.
      const url = `${BASE_URL}/${name}.svg`;
      console.log(`fetching ${name} from upstream`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download ${name}: ${res.status}`);
      svg = Buffer.from(await res.arrayBuffer());
      await writeFile(rawPath, svg);
    }
    await sharp(svg, { density: 300 })
      .resize({ width: WIDTH })
      .webp({ quality: 88, effort: 6 })
      .toFile(outPath);
    const { size } = await stat(outPath);
    totalBytes += size;
    console.log(`${name.padEnd(4)} → ${(size / 1024).toFixed(1).padStart(6)} KB`);
  }
}
console.log(`\nTOTAL: ${(totalBytes / 1024).toFixed(1)} KB`);
