import { isRed, SUIT_SYMBOLS } from "../stack";

const GRID_SUITS = ["S", "H", "D", "C"];
const GRID_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];

export function NumberGrid({
  onSelect,
  count = 52,
  start = 1,
}: {
  onSelect: (n: number) => void;
  count?: number;
  start?: number;
}) {
  return (
    <div className="number-grid">
      {Array.from({ length: count }, (_, i) => i + start).map((n) => (
        <button key={n} type="button" className="grid-cell num-cell" onClick={() => onSelect(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

export function CardGrid({ onSelect }: { onSelect: (card: string) => void }) {
  return (
    <div className="card-grid">
      {GRID_SUITS.flatMap((suit) =>
        GRID_RANKS.map((rank) => {
          const card = rank + suit;
          return (
            <button
              key={card}
              type="button"
              className={`grid-cell card-cell ${isRed(card) ? "is-red" : "is-black"}`}
              onClick={() => onSelect(card)}
            >
              <span className="cc-rank">{rank === "T" ? "10" : rank}</span>
              <span className="cc-suit">{SUIT_SYMBOLS[suit]}</span>
            </button>
          );
        }),
      )}
    </div>
  );
}
