// Robust iOS web-asset sync.
//
// This project lives in an iCloud-synced Documents folder, and iCloud
// occasionally creates "<name> 2" conflict copies while Capacitor rewrites the
// public folder during `cap sync`. When that happens the app's hashed JS/CSS
// can land in `assets 2/` while index.html still points at `assets/`, so the
// WebView 404s its own bundle and shows a white screen.
//
// This script: cleans the public folder, runs cap sync, force-copies the fresh
// dist over the top, merges away any "* 2" duplicates, and finally VERIFIES
// that every asset index.html references actually exists — failing loudly
// instead of shipping a white screen.

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const PUB = "ios/App/App/public";
const run = (cmd) => execSync(cmd, { stdio: "inherit", env: { ...process.env, LANG: "en_US.UTF-8" } });

// All "<name> 2" iCloud conflict copies under ios/.
function findDupes() {
  try {
    return execSync(`find ios -name "* 2" -prune 2>/dev/null`)
      .toString()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Merge each "<name> 2" back into "<name>" (its contents win), then remove it.
function healDupes() {
  for (const dup of findDupes()) {
    const base = dup.replace(/ 2$/, "");
    if (existsSync(base)) {
      cpSync(dup, base, { recursive: true, force: true });
      rmSync(dup, { recursive: true, force: true });
    } else {
      mkdirSync(dirname(base), { recursive: true });
      renameSync(dup, base);
    }
  }
}

console.log("→ cleaning iOS public folder");
rmSync(PUB, { recursive: true, force: true });
healDupes();

console.log("→ cap sync ios");
run("npx cap sync ios");

console.log("→ force-copying fresh web assets");
rmSync(join(PUB, "assets"), { recursive: true, force: true });
cpSync("dist/assets", join(PUB, "assets"), { recursive: true });
cpSync("dist/index.html", join(PUB, "index.html"));
healDupes();

// Verify every JS/CSS index.html references really exists under public/.
const html = readFileSync(join(PUB, "index.html"), "utf8");
const refs = [...html.matchAll(/assets\/[^"']+\.(?:js|css)/g)].map((m) => m[0]);
const missing = refs.filter((r) => !existsSync(join(PUB, r)));
if (missing.length) {
  console.error("\n✗ iOS web assets are broken — these are missing from public/:");
  for (const m of missing) console.error("   " + m);
  console.error("Re-run `npm run ios` (the iCloud conflict is usually transient).\n");
  process.exit(1);
}
console.log(`✓ iOS web assets OK — ${readdirSync(join(PUB, "assets")).length} files, bundle present`);
