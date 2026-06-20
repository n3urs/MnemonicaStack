import { useState } from "react";
import { STACK } from "../stack";
import { PlayingCard } from "../components/PlayingCard";

// Dead-simple flasher: one full-screen card, tap anywhere to cut to another
// random card. No prompts, no scoring — just a card to react to. Pulls from the
// whole 52, never repeating the same card twice in a row.
function pickCard(exclude?: string): string {
  let card = STACK[Math.floor(Math.random() * STACK.length)];
  while (STACK.length > 1 && card === exclude) {
    card = STACK[Math.floor(Math.random() * STACK.length)];
  }
  return card;
}

export function RandomCard({ onBack }: { onBack: () => void }) {
  const [card, setCard] = useState(() => pickCard());

  return (
    <div
      className="random-card"
      role="button"
      tabIndex={0}
      aria-label="Random card — tap for the next one"
      onClick={() => setCard((c) => pickCard(c))}
    >
      <button
        type="button"
        className="random-card-back"
        aria-label="Back"
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
      >
        ← Back
      </button>
      <PlayingCard card={card} size="large" />
      <span className="random-card-hint">press anywhere to cycle</span>
    </div>
  );
}
