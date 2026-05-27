// Card visuals are now bundled bitmaps — one WebP per card, pre-rounded and
// optimised by scripts/build-cards.mjs from the source PNGs in extracted_cards/.
// Indices, pips and face art all ship inside the image; this component just
// shows the right file at the right size.

import { isRed } from "../stack";

type Size = "small" | "medium" | "large";

// One-time eager glob: Vite picks up every webp in src/assets/cards/ at build
// time and gives us a map of card-name → resolved URL. Easier to maintain than
// 52 individual imports and each card is still hashed individually by Vite,
// so the browser only fetches what it renders.
const cardUrls = import.meta.glob<string>("../assets/cards/*.webp", {
  eager: true,
  import: "default",
});

const CARD_SRC: Record<string, string> = Object.fromEntries(
  Object.entries(cardUrls).map(([k, v]) => [
    // Glob keys look like "../assets/cards/AS.webp" — pull just the name.
    k.split("/").pop()!.replace(/\.webp$/, ""),
    v,
  ]),
);

export function PlayingCard({ card, size = "medium" }: { card: string; size?: Size }) {
  const src = CARD_SRC[card];
  return (
    <div className={`playing-card playing-card--${size} ${isRed(card) ? "is-red" : "is-black"}`}>
      {src ? (
        <img className="pc-image" src={src} alt={card} draggable={false} />
      ) : (
        // Fallback if a card's asset is missing — shouldn't happen, but
        // better than a broken-image icon.
        <span className="pc-missing">{card}</span>
      )}
    </div>
  );
}
