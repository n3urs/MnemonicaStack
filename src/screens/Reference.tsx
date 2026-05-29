import { useState } from "react";
import type { Stats } from "../storage";
import { STACK, cardName, positionOf } from "../stack";
import { defaultCardImage, positionPeg } from "../mnemonics";
import { PlayingCard } from "../components/PlayingCard";

export function Reference({ stats, onBack }: { stats: Stats; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const sel = selected ? stats.cards[selected] : undefined;
  const selBox = selected ? stats.learn[selected]?.box : undefined;

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
        memory hooks. Tap a card for its stats; a dot marks ones you've missed a lot.
      </p>

      <div className="reference-grid">
        {STACK.map((card, i) => {
          const image = stats.notes[card]?.image?.trim() || defaultCardImage(card);
          const peg = stats.pegs[String(i + 1)]?.trim() || positionPeg(i + 1);
          const struggling = (stats.cards[card]?.wrong ?? 0) >= 3;
          return (
            <button
              key={card}
              type="button"
              className={`reference-cell ${struggling ? "is-struggling" : ""}`}
              onClick={() => setSelected(card)}
            >
              <span className="ref-pos">
                {i + 1} · {peg}
              </span>
              <PlayingCard card={card} size="small" />
              {struggling && <span className="ref-badge" aria-label="frequently missed" />}
              <span className="ref-image">{image}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="ref-detail-overlay" onClick={() => setSelected(null)}>
          <div className="ref-detail" onClick={(e) => e.stopPropagation()}>
            <PlayingCard card={selected} size="medium" />
            <div className="ref-detail-body">
              <span className="ref-detail-name">{cardName(selected)}</span>
              <span className="ref-detail-pos">position {positionOf(selected)}</span>
              <div className="ref-detail-stats">
                <div className="ref-stat">
                  <span className="ref-stat-value">{sel?.seen ?? 0}</span>
                  <span className="ref-stat-label">seen</span>
                </div>
                <div className="ref-stat">
                  <span className="ref-stat-value">{sel?.correct ?? 0}</span>
                  <span className="ref-stat-label">correct</span>
                </div>
                <div className="ref-stat">
                  <span className="ref-stat-value">
                    {sel && sel.seen > 0 ? `${Math.round((sel.correct / sel.seen) * 100)}%` : "—"}
                  </span>
                  <span className="ref-stat-label">accuracy</span>
                </div>
                <div className="ref-stat">
                  <span className="ref-stat-value">{selBox ?? "—"}</span>
                  <span className="ref-stat-label">box</span>
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-ghost ref-detail-close" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
