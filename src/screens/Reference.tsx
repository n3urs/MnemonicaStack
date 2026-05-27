import type { Stats } from "../storage";
import { STACK } from "../stack";
import { defaultCardImage, positionPeg } from "../mnemonics";
import { PlayingCard } from "../components/PlayingCard";

export function Reference({ stats, onBack }: { stats: Stats; onBack: () => void }) {
  return (
    <div className="screen reference-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">The full stack</span>
        <span className="toolbar-spacer" />
      </div>

      <p className="reference-note">
        Positions 1–52 — top (the card you deal first) down to the bottom (the face card), with
        memory hooks.
      </p>

      <div className="reference-grid">
        {STACK.map((card, i) => {
          const image = stats.notes[card]?.image?.trim() || defaultCardImage(card);
          const peg = stats.pegs[String(i + 1)]?.trim() || positionPeg(i + 1);
          return (
            <div key={card} className="reference-cell">
              <span className="ref-pos">
                {i + 1} · {peg}
              </span>
              <PlayingCard card={card} size="small" />
              <span className="ref-image">{image}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
