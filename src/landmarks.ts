// Shared landmark data for the performance tools — crimps, anchors, the
// self-locating cards, the TPC step list, and the "get a named card to the
// top" routing logic. Kept in one place so the Toolkit and Insights screens
// agree on the landmarks.

import { cardAt, cardName, cardShort, positionOf } from "./stack";

export const TOP_POS = 1;
export const BOTTOM_POS = 52;

// The two crimped quarter-deck anchors. The positions are fixed (18 and 35);
// which cards live there depends on the active stack.
export const CRIMP_POSITIONS = [18, 35];

// Every reference point you can cut/spread to without counting from an end.
export const ANCHOR_POSITIONS = [TOP_POS, 18, 35, BOTTOM_POS];

// Nearest anchor position to a given position, and the (signed) offset to it.
export function nearestAnchor(pos: number): { anchor: number; offset: number } {
  let best = ANCHOR_POSITIONS[0];
  for (const a of ANCHOR_POSITIONS) {
    if (Math.abs(pos - a) < Math.abs(pos - best)) best = a;
  }
  return { anchor: best, offset: pos - best };
}

// Tamariz Perpendicular Control — the six working steps.
export const TPC_STEPS: { title: string; detail: string }[] = [
  {
    title: "Set the grip",
    detail:
      "Deck in left-hand dealing grip. The left thumb runs along the left edge; the left little finger sits at the inner-right corner.",
  },
  {
    title: "Find the corner",
    detail:
      "Get the target card jogged slightly right so its inner-right corner protrudes from the right side and touches the left little fingertip. The left thumb covers the card's outer-left corner.",
  },
  {
    title: "Pivot it perpendicular",
    detail:
      "The left thumb draws the card's outer-left corner inward to the deck's inner-left corner while the little finger pushes the inner-right corner outward. The card pivots 90° — now perpendicular.",
  },
  {
    title: "Hide the angle",
    detail:
      "The right hand stays over the deck, covering the protruding card. Tilt the deck about 15° to the right to kill the only bad angle (from above-left).",
  },
  {
    title: "Cover and release",
    detail:
      "Push a few top cards slightly right to further hide the sticking-out portion. The right hand can now leave the deck.",
  },
  {
    title: "Transport it",
    detail:
      "Spread the cards hand to hand — the right fingers hold the perpendicular card so it ends up lying under the spread. Slip it into any gap you like (or just let it go to the bottom), then square up.",
  },
];

export interface ControlRoute {
  position: number;
  kind: "near-top" | "crimp" | "general";
  summary: string;
  steps: string[];
}

// Recommended route to bring a named card to the top, given its position.
// Mirrors the decision logic: near the top → simple control; within ~9 of a
// crimped King → cut to the crimp and count the small gap; otherwise spread,
// count, TPC. The remaining 51 cards always stay in stack order.
export function namedCardRoute(position: number): ControlRoute {
  const intact = "The TPC removes only that one card — the other 51 stay in full stack order.";

  if (position <= 5) {
    return {
      position,
      kind: "near-top",
      summary: `Only ${position - 1} card${position - 1 === 1 ? "" : "s"} above it — control from the top.`,
      steps: [
        position === 1
          ? "It's already the top card."
          : `Use a quick overhand-shuffle control or a few cuts to bring it up the last ${position - 1}.`,
        intact,
      ],
    };
  }

  const dC = Math.abs(position - 18);
  const dH = Math.abs(position - 35);
  if (Math.min(dC, dH) <= 9) {
    const pos = dC <= dH ? 18 : 35;
    const crimp = { pos, name: cardShort(cardAt(pos)) };
    const offset = position - crimp.pos;
    const dir = offset > 0 ? "below" : "above";
    const gap = Math.abs(offset);
    return {
      position,
      kind: "crimp",
      summary: `${gap} card${gap === 1 ? "" : "s"} ${dir} the ${crimp.name} crimp (pos ${crimp.pos}).`,
      steps: [
        `Cut to the ${crimp.name} crimp — that puts position ${crimp.pos} at a known spot.`,
        `Spread ${gap} card${gap === 1 ? "" : "s"} ${dir} it to reach your card.`,
        "TPC your card to the bottom, then one cut brings it to the top.",
        intact,
      ],
    };
  }

  return {
    position,
    kind: "general",
    summary: `Position ${position} — no anchor close by, so count to it.`,
    steps: [
      `Spread the deck and count to position ${position}.`,
      "TPC that card to the bottom, then cut it to the top.",
      intact,
    ],
  };
}

// Convenience: full description for a chosen card (used by the Toolkit).
export function routeForCard(card: string): ControlRoute {
  return namedCardRoute(positionOf(card));
}

export function cardLabel(card: string): string {
  return cardName(card);
}
