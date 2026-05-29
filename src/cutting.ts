// "Cut to it" system: reach any position from the nearest anchor.
// Anchors: the top card (1) and bottom card (52) are free (no crimp needed);
// the two crimped Kings — K♣ at 18 and K♥ at 35 — are the quarter-deck anchors.
// The farthest any card sits from its nearest anchor is 9, so every count is short.
//
// After an anchor (+offset): cut the break to the top, count off the FRONT edge,
//   double-undercut to the bottom — card ends on top.
// Before an anchor (-offset): cut the break to the bottom, count up the BACK edge,
//   double-undercut to the top — card ends on top.

interface Anchor {
  pos: number;
  free?: "top" | "bottom";
  cutTop?: string;
  cutBottom?: string;
}

const ANCHORS: Anchor[] = [
  { pos: 1, free: "top" },
  { pos: 18, cutTop: "Cut K♣ (crimp) to the top", cutBottom: "Cut K♣ (crimp) to the bottom" },
  { pos: 35, cutTop: "Cut K♥ (crimp) to the top", cutBottom: "Cut K♥ (crimp) to the bottom" },
  { pos: 52, free: "bottom" },
];

const ANCHOR_NAME: Record<number, string> = { 1: "the top", 18: "K♣", 35: "K♥", 52: "the bottom" };

function nearestAnchor(pos: number): Anchor {
  return ANCHORS.reduce((best, a) => (Math.abs(pos - a.pos) < Math.abs(pos - best.pos) ? a : best));
}

export interface CutMethod {
  position: number;
  anchorName: string;
  text: string;
}

export function cutMethod(position: number): CutMethod {
  const a = nearestAnchor(position);
  const d = position - a.pos;
  return { position, anchorName: ANCHOR_NAME[a.pos], text: buildText(a, d) };
}

function buildText(a: Anchor, d: number): string {
  if (d === 0) {
    if (a.free === "top") return "It's the top card — turn it over.";
    if (a.free === "bottom") return "It's the bottom (face) card — turn the deck over.";
    return `${a.cutTop} — it's now the top card.`;
  }
  if (d === 1) {
    const lead = a.free === "top" ? "" : `${a.cutTop}, then `;
    return `${lead}double lift — your card is second from the top.`;
  }
  if (d === -1) {
    if (a.free === "bottom") return "It's second from the face — buckle the bottom card and take the next.";
    return `${a.cutTop} — your card is now the bottom card; turn it over.`;
  }
  if (d > 1) {
    const lead = a.free === "top" ? "" : `${a.cutTop}, then `;
    return `${lead}thumb-count ${d} off the top and double-undercut them to the bottom — your card's on top.`;
  }
  const n = -d;
  const lead = a.free === "bottom" ? "" : `${a.cutBottom}, then `;
  return `${lead}thumb-count ${n} up the back edge and double-undercut them to the top — your card's on top.`;
}
