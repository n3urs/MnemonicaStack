// One-off script: produces all 52 card WebPs in src/assets/cards/ from
// Saul Spatz's public-domain jumbo-index SVG deck.
//
// Why this deck: closest match to a real Bicycle's proportions — daintier
// pips with proper white space, cream background, inner border frame, big
// bold corner indices, traditional Bicycle court colours.
//
// Vector source → no washing, no centring drift. Each card is rendered at
// high density, resized to 480px (≈3.2× the largest display size of 148px),
// rounded at the corners and encoded as WebP q90.
//
// Source: SVGCards by Saul Spatz, public domain.
//   https://github.com/saulspatz/SVGCards (Vertical2 deck, 2-colour suits)
//
// Run with: node scripts/build-cards.mjs

import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "extracted_cards/svg"; // cached download dir
const OUT = "src/assets/cards";
const WIDTH = 480;
// Real cards have a corner radius of ~5.5% of their short edge. The saulspatz
// SVG already has a rounded outer rect at 12 units on a 210×315 viewBox (≈6%),
// so the WebP corners are mostly already pre-rounded. Mask with a slightly
// smaller radius to soften the edge that survives resampling.
const RADIUS_PCT = 0.05;
const BASE = "https://raw.githubusercontent.com/saulspatz/SVGCards/master/Decks/Vertical2/svgs";

// Map our internal codes → upstream filenames.
//   suit: S/H/D/C → spade/heart/diamond/club
//   rank: A/T/J/Q/K → Ace/10/Jack/Queen/King; 2–9 stay numeric.
const SUIT_NAMES = { S: "spade", H: "heart", D: "diamond", C: "club" };
const RANK_NAMES = {
  A: "Ace",
  T: "10",
  J: "Jack",
  Q: "Queen",
  K: "King",
};
const upstreamName = (rank, suit) =>
  `${SUIT_NAMES[suit]}${RANK_NAMES[rank] ?? rank}.svg`;

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const SUITS = ["S", "H", "D", "C"];

await mkdir(SRC, { recursive: true });
await mkdir(OUT, { recursive: true });

// Wipe stale outputs so removed/renamed cards don't linger.
for (const f of (await readdir(OUT)).filter((n) => n.endsWith(".webp"))) {
  await unlink(join(OUT, f));
}
// Also wipe stale SVG cache from a previous source — different deck shapes
// would silently mix otherwise.
for (const f of (await readdir(SRC)).filter((n) => n.endsWith(".svg"))) {
  await unlink(join(SRC, f));
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
      if (!res.ok) throw new Error(`download ${name} (${url}): ${res.status}`);
      svg = Buffer.from(await res.arrayBuffer());
      await writeFile(srcFile, svg);
    }

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
