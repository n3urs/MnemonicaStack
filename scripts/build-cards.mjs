// One-off script: takes the 52 source PNGs in extracted_cards/ (the user's
// own card art) and produces optimised, rounded-corner WebPs in
// src/assets/cards/.
//
// Steps:
//   1. resize to 320px wide (≈2× the largest display size, crisp on Retina)
//   2. composite with an SVG rounded-rect mask so the card has soft corners
//      instead of the source's sharp ones
//   3. encode as WebP q88 — visually lossless for these illustrations and
//      ~3× smaller than the source PNG
//
// Run with: node scripts/build-cards.mjs

import { mkdir, readdir, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "extracted_cards";
const OUT = "src/assets/cards";
const WIDTH = 320;
// Real cards have a corner radius of ~5% of their short edge. Same fraction
// keeps the rounded corners proportional at any display size.
const RADIUS_PCT = 0.055;

await mkdir(OUT, { recursive: true });

// Wipe any old generated assets so removed source cards don't linger.
for (const f of (await readdir(OUT)).filter((n) => n.endsWith(".webp"))) {
  await unlink(join(OUT, f));
}

const files = (await readdir(SRC)).filter((f) => f.endsWith(".png")).sort();
let totalBytes = 0;

for (const file of files) {
  const inPath = join(SRC, file);
  const outPath = join(OUT, file.replace(/\.png$/, ".webp"));

  // First pass: resize to the target width to fix the dimensions we'll round
  // against. We need the post-resize width/height to build a mask that fits.
  const { data, info } = await sharp(await readFile(inPath))
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
    .webp({ quality: 88, effort: 6, alphaQuality: 100 })
    .toFile(outPath);

  const { size } = await stat(outPath);
  totalBytes += size;
  console.log(`${file.padEnd(8)} → ${(size / 1024).toFixed(1).padStart(6)} KB`);
}

console.log(`\nTOTAL: ${(totalBytes / 1024).toFixed(1)} KB across ${files.length} cards`);
