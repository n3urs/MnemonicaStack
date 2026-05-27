import { useState } from "react";
import type { CardNote, Stats } from "../storage";
import { learnedCount } from "../storage";
import { cardName, STACK } from "../stack";
import { defaultCardImage, MAJOR_SOUNDS, positionPeg } from "../mnemonics";
import { PlayingCard } from "../components/PlayingCard";
import { PositionDisplay } from "../components/PositionDisplay";

export function Learn({
  stats,
  onIntroduce,
  onSetNote,
  onSetPeg,
  onBack,
}: {
  stats: Stats;
  onIntroduce: (card: string) => void;
  onSetNote: (card: string, patch: CardNote) => void;
  onSetPeg: (position: number, value: string) => void;
  onBack: () => void;
}) {
  const firstUnlearned = STACK.findIndex((c) => !stats.learn[c]?.introduced);
  const [index, setIndex] = useState(firstUnlearned === -1 ? 0 : firstUnlearned);

  const card = STACK[index];
  const position = index + 1;
  const note = stats.notes[card] ?? {};
  const defaultPeg = positionPeg(position);
  const defaultImage = defaultCardImage(card);
  const peg = stats.pegs[String(position)]?.trim() || defaultPeg;
  const image = note.image?.trim() || defaultImage;
  const learned = !!stats.learn[card]?.introduced;
  const count = learnedCount(stats);

  function go(delta: number) {
    setIndex((i) => Math.min(STACK.length - 1, Math.max(0, i + delta)));
  }

  function markLearned() {
    onIntroduce(card);
    if (index < STACK.length - 1) setIndex(index + 1);
  }

  return (
    <div className="screen learn">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Learn the stack</span>
        <span className="toolbar-spacer" />
      </div>

      <div className="learn-progress">
        <div className="learn-progress-bar">
          <span style={{ width: `${(count / 52) * 100}%` }} />
        </div>
        <span className="learn-progress-text">{count} / 52 learned</span>
      </div>

      <div className="learn-card" key={card}>
        <div className="learn-pair">
          <div className="learn-side">
            <PositionDisplay position={position} size="medium" />
            <span className="learn-peg">{peg}</span>
            <span className="learn-cue">peg for {position}</span>
          </div>
          <span className="learn-amp" aria-hidden="true">
            &amp;
          </span>
          <div className="learn-side">
            <PlayingCard card={card} size="medium" />
            <span className="learn-peg">{image}</span>
            <span className="learn-cue">{cardName(card)}</span>
          </div>
        </div>

        <p className="learn-link-hint">
          Picture your <strong>{peg}</strong> and the <strong>{image}</strong> together in one
          vivid, absurd scene — that link is what you'll recall.
        </p>

        <label className="learn-field">
          <span className="learn-field-label">Your peg for position {position}</span>
          <input
            className="learn-input"
            type="text"
            value={stats.pegs[String(position)] ?? ""}
            placeholder={defaultPeg}
            onChange={(e) => onSetPeg(position, e.target.value)}
          />
        </label>

        <label className="learn-field">
          <span className="learn-field-label">Your image for this card</span>
          <input
            className="learn-input"
            type="text"
            value={note.image ?? ""}
            placeholder={defaultImage}
            onChange={(e) => onSetNote(card, { image: e.target.value })}
          />
        </label>

        <label className="learn-field">
          <span className="learn-field-label">Your link</span>
          <input
            className="learn-input"
            type="text"
            value={note.link ?? ""}
            placeholder={`e.g. a ${peg} crashing into a ${image}`}
            onChange={(e) => onSetNote(card, { link: e.target.value })}
          />
        </label>

        <button
          type="button"
          className={`btn ${learned ? "btn-ghost" : "btn-primary"} learn-mark`}
          onClick={markLearned}
        >
          {learned ? "Learned ✓ — next card" : "Mark as learned"}
        </button>
      </div>

      <div className="learn-nav">
        <button type="button" className="btn btn-ghost" onClick={() => go(-1)} disabled={index === 0}>
          ← Previous
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => go(1)}
          disabled={index === STACK.length - 1}
        >
          Next →
        </button>
      </div>

      <details className="major-help">
        <summary>How the position pegs work</summary>
        <p className="major-help-text">
          Each digit maps to a consonant sound; vowels are free, so a number becomes a word you
          can picture. Position {position} → "{defaultPeg}". Face cards aren't derivable, so they
          get a memorable figure instead.
        </p>
        <div className="major-table">
          {MAJOR_SOUNDS.map((m) => (
            <div key={m.digit} className="major-row">
              <span className="major-digit">{m.digit}</span>
              <span className="major-sound">{m.sounds}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
