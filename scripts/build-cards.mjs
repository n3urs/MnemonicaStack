// One-off script: produces all 52 card WebPs in src/assets/cards/ from
// Letele Motebang's CC0 SVG playing-card deck.
//
// Why this deck: clean Bicycle-style proportions — daintier pips with proper
// white space, classic traditional court art (blue/red/yellow), standard
// (not jumbo) corner indices.
//
// Vector source → no washing, no centring drift. Each card is rendered at
// high density, resized to 480px (≈3.2× the largest display size of 148px),
// rounded at the corners and encoded as WebP q90.
//
// Source: @letele/playing-cards by Letele Motebang, CC0 1.0.
//   https://github.com/letele/playing-cards
//
// Run with: node scripts/build-cards.mjs

import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "extracted_cards/svg"; // cached download dir
const OUT = "src/assets/cards";
const WIDTH = 480;
// Real cards have a corner radius of ~5.5% of their short edge.
const RADIUS_PCT = 0.055;
const BASE = "https://raw.githubusercontent.com/letele/playing-cards/master/assets";

// Map our internal codes → upstream filenames.
//   Upstream: {SUIT}-{RANK}.svg, suits S/H/D/C, ranks 2..10/J/Q/K/A.
//   We use the same suits and "T" for 10, so just translate T → 10.
const upstreamName = (rank, suit) =>
  `${suit}-${rank === "T" ? "10" : rank}.svg`;

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

    // The Ace of Spades in letele's deck carries the upstream artist's
    // watermark — a small QR code carved into the spade plus a "www.me.uk
    // /cards/" credit underneath. Strip both so the AS looks like a clean
    // classic ace. (Other cards in the deck are unmarked.)
    if (name === "AS") {
      svg = Buffer.from(
        svg
          .toString("utf8")
          // QR-code path: identifiable by its scale(1.704) transform.
          .replace(/<path\s+transform="[^"]*scale\(1\.704\)[^"]*"[^>]*><\/path>/g, "")
          // Two text labels under the spade.
          .replace(/<text[^>]*>www\.me\.uk<\/text>/g, "")
          .replace(/<text[^>]*>\/cards\/<\/text>/g, ""),
      );
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
