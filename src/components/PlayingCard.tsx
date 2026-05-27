import { displayRank, isRed, suitOf, SUIT_SYMBOLS } from "../stack";

type Size = "small" | "medium" | "large";

export function PlayingCard({ card, size = "medium" }: { card: string; size?: Size }) {
  const rank = displayRank(card);
  const suit = SUIT_SYMBOLS[suitOf(card)];
  return (
    <div className={`playing-card playing-card--${size} ${isRed(card) ? "is-red" : "is-black"}`}>
      <span className="pc-corner pc-corner--tl">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </span>
      <span className="pc-center">{suit}</span>
      <span className="pc-corner pc-corner--br">
        <span className="pc-rank">{rank}</span>
        <span className="pc-suit">{suit}</span>
      </span>
    </div>
  );
}
