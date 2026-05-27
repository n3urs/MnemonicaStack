import { displayRank, isRed, rankOf, suitOf, SUIT_SYMBOLS } from "../stack";

import JC from "../assets/cards/JC.webp";
import JD from "../assets/cards/JD.webp";
import JH from "../assets/cards/JH.webp";
import JS from "../assets/cards/JS.webp";
import KC from "../assets/cards/KC.webp";
import KD from "../assets/cards/KD.webp";
import KH from "../assets/cards/KH.webp";
import KS from "../assets/cards/KS.webp";
import QC from "../assets/cards/QC.webp";
import QD from "../assets/cards/QD.webp";
import QH from "../assets/cards/QH.webp";
import QS from "../assets/cards/QS.webp";

type Size = "small" | "medium" | "large";

const FACE_IMAGES: Record<string, string> = {
  JS, JH, JD, JC,
  QS, QH, QD, QC,
  KS, KH, KD, KC,
};

// Pip arrangements for 2–10 in the canonical playing-card layout. Each pip is
// [x, y, flipped?] in the card-body coordinate space (0..1 horizontal,
// 0..1 vertical inside the body inset). "flipped" rotates the pip 180°, which
// is how real cards make hearts/diamonds visually balanced on the bottom
// half — you can tell a card from either end without spinning it.
type Pip = readonly [x: number, y: number, flipped: boolean];

const PIPS: Record<string, readonly Pip[]> = {
  "2": [
    [0.5, 0.13, false],
    [0.5, 0.87, true],
  ],
  "3": [
    [0.5, 0.13, false],
    [0.5, 0.5, false],
    [0.5, 0.87, true],
  ],
  "4": [
    [0.27, 0.16, false], [0.73, 0.16, false],
    [0.27, 0.84, true], [0.73, 0.84, true],
  ],
  "5": [
    [0.27, 0.16, false], [0.73, 0.16, false],
    [0.5, 0.5, false],
    [0.27, 0.84, true], [0.73, 0.84, true],
  ],
  "6": [
    [0.27, 0.16, false], [0.73, 0.16, false],
    [0.27, 0.5, false], [0.73, 0.5, false],
    [0.27, 0.84, true], [0.73, 0.84, true],
  ],
  "7": [
    [0.27, 0.16, false], [0.73, 0.16, false],
    [0.5, 0.33, false],
    [0.27, 0.5, false], [0.73, 0.5, false],
    [0.27, 0.84, true], [0.73, 0.84, true],
  ],
  "8": [
    [0.27, 0.16, false], [0.73, 0.16, false],
    [0.5, 0.33, false],
    [0.27, 0.5, false], [0.73, 0.5, false],
    [0.5, 0.67, true],
    [0.27, 0.84, true], [0.73, 0.84, true],
  ],
  "9": [
    [0.27, 0.14, false], [0.73, 0.14, false],
    [0.27, 0.38, false], [0.73, 0.38, false],
    [0.5, 0.5, false],
    [0.27, 0.62, true], [0.73, 0.62, true],
    [0.27, 0.86, true], [0.73, 0.86, true],
  ],
  "10": [
    [0.27, 0.13, false], [0.73, 0.13, false],
    [0.5, 0.27, false],
    [0.27, 0.4, false], [0.73, 0.4, false],
    [0.27, 0.6, true], [0.73, 0.6, true],
    [0.5, 0.73, true],
    [0.27, 0.87, true], [0.73, 0.87, true],
  ],
};

// SVG viewBox sized roughly to the card body (the area inside the corner
// indices). 100 × 140 ≈ 5:7, matching the card's aspect.
const VB_W = 100;
const VB_H = 140;

function PipBody({ rank, suit }: { rank: string; suit: string }) {
  // Ace gets one large central pip — the traditional "decorated ace" reads
  // as a single big suit mark, far larger than body pips on numbered cards.
  if (rank === "A") {
    return (
      <svg
        className="pc-pips"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <text x={VB_W / 2} y={VB_H / 2} className="pc-pip pc-pip--ace">
          {suit}
        </text>
      </svg>
    );
  }
  const pips = PIPS[rank] ?? [];
  return (
    <svg
      className="pc-pips"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {pips.map(([x, y, flipped], i) => {
        const cx = x * VB_W;
        const cy = y * VB_H;
        return (
          <text
            key={i}
            x={cx}
            y={cy}
            className="pc-pip"
            transform={flipped ? `rotate(180 ${cx} ${cy})` : undefined}
          >
            {suit}
          </text>
        );
      })}
    </svg>
  );
}

export function PlayingCard({ card, size = "medium" }: { card: string; size?: Size }) {
  const rank = rankOf(card);
  const suit = SUIT_SYMBOLS[suitOf(card)];
  const display = displayRank(card);
  const isFace = rank === "J" || rank === "Q" || rank === "K";
  return (
    <div
      className={`playing-card playing-card--${size} ${isRed(card) ? "is-red" : "is-black"} ${isFace ? "is-face" : ""}`}
    >
      {isFace ? (
        // The bundled deck has its own border + corner indices baked in, so
        // we render the image at full card size and skip our own indices.
        <img className="pc-face" src={FACE_IMAGES[card]} alt="" draggable={false} />
      ) : (
        <>
          <span className="pc-corner pc-corner--tl">
            <span className="pc-rank">{display}</span>
            <span className="pc-suit">{suit}</span>
          </span>
          <PipBody rank={rank} suit={suit} />
          <span className="pc-corner pc-corner--br">
            <span className="pc-rank">{display}</span>
            <span className="pc-suit">{suit}</span>
          </span>
        </>
      )}
    </div>
  );
}
