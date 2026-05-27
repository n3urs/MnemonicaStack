// One-off script: produces all 52 card WebPs in src/assets/cards/ from
// Byron Knoll's public-domain SVG deck (mirrored by notpeter on GitHub).
//
// Vector source → no washing, no centring drift. Each card is rendered at
// high density, resized to 480px (≈3.2× the largest display size of 148px),
// rounded at the corners, and encoded as WebP q90.
//
// Source: cards by Byron Knoll, public domain (or WTFPL).
//   https://github.com/notpeter/Vector-Playing-Cards
//
// Run with: node scripts/build-cards.mjs

import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "extracted_cards/svg"; // cached download dir
const OUT = "src/assets/cards";
const WIDTH = 480;
// Real cards have a corner radius of ~5.5% of their short edge. Same fraction
// at any output size keeps the rounding visually consistent.
const RADIUS_PCT = 0.055;
const BASE = "https://raw.githubusercontent.com/notpeter/Vector-Playing-Cards/master/cards-svg";

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const SUITS = ["S", "H", "D", "C"];

// Upstream uses "10" where our codebase uses "T" everywhere else. Translate
// for downloads, keep "T" for the output filename so the rest of the app
// doesn't have to change.
const upstreamName = (rank, suit) => `${rank === "T" ? "10" : rank}${suit}.svg`;

await mkdir(SRC, { recursive: true });
await mkdir(OUT, { recursive: true });

// Wipe stale outputs so removed/renamed cards don't linger.
for (const f of (await readdir(OUT)).filter((n) => n.endsWith(".webp"))) {
  await unlink(join(OUT, f));
}

let totalBytes = 0;
for (const rank of RANKS) {
  for (const suit of SUITS) {
    const name = `${rank}${suit}`;
    const srcFile = join(SRC, `${name}.svg`);
    const outFile = join(OUT, `${name}.webp`);

    let svg;
    try {
      svg = await readFile(srcFile);
    } catch {
      const url = `${BASE}/${upstreamName(rank, suit)}`;
      console.log(`fetching ${name} from upstream`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download ${name}: ${res.status}`);
      svg = Buffer.from(await res.arrayBuffer());
      await writeFile(srcFile, svg);
    }

    // First pass: render the SVG at high density and resize to the target
    // width — we need post-resize dimensions to size the rounded-corner mask.
    const { data, info } = await sharp(svg, { density: 600 })
      .resize({ width: WIDTH })
      .png()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const radius = Math.round(width * RADIUS_PCT);

    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
         <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="black"/>
       </svg>`,
    );

    await sharp(data)
      .composite([{ input: mask, blend: "dest-in" }])
      .webp({ quality: 90, effort: 6, alphaQuality: 100 })
      .toFile(outFile);

    const { size } = await stat(outFile);
    totalBytes += size;
    console.log(`${name.padEnd(4)} → ${(size / 1024).toFixed(1).padStart(6)} KB`);
  }
}

console.log(`\nTOTAL: ${(totalBytes / 1024).toFixed(1)} KB across 52 cards`);
