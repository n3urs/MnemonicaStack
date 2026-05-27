import { useEffect, useRef, useState } from "react";
import { selectLearnedCard, type Stats } from "../storage";
import { cardName, positionOf } from "../stack";
import { cutMethod } from "../cutting";
import { PlayingCard } from "../components/PlayingCard";
import { cancelSpeech, speak } from "../speech";

export function CutTrainer({
  stats,
  onSetCutNote,
  onBack,
  onLearn,
}: {
  stats: Stats;
  onSetCutNote: (position: number, value: string) => void;
  onBack: () => void;
  onLearn: () => void;
}) {
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const lastRef = useRef<string | undefined>(undefined);

  function pick(): string | null {
    const c = selectLearnedCard(statsRef.current, lastRef.current);
    if (!c) return null;
    lastRef.current = c;
    return c;
  }

  const [card, setCard] = useState<string | null>(pick);
  const [revealed, setRevealed] = useState(false);
  const [round, setRound] = useState(0);
  // Spoken-card mode: off by default each time you enter the trainer.
  const [audioPrompt, setAudioPrompt] = useState(false);

  // Auto-speak the card name when audioPrompt is on and a new card appears.
  useEffect(() => {
    if (audioPrompt && card) speak(cardName(card));
  }, [card, audioPrompt]);

  // Cancel any in-progress speech when leaving the trainer.
  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  if (!card) {
    return (
      <div className="screen cut-screen">
        <div className="toolbar">
          <button type="button" className="btn-link" onClick={onBack}>
            ← Back
          </button>
          <span className="toolbar-title">Cut to it</span>
          <span className="toolbar-spacer" />
        </div>
        <div className="empty-drill">
          <div className="ornament" aria-hidden="true">
            <span className="orn-black">♠</span>
            <span className="orn-red">♥</span>
            <span className="orn-red">♦</span>
            <span className="orn-black">♣</span>
          </div>
          <p className="empty-drill-text">
            You haven't learned any cards yet. The cut trainer only quizzes cards you've studied,
            so start in the learn screen and come back once you have a few.
          </p>
          <button type="button" className="btn btn-primary" onClick={onLearn}>
            Go to learn
          </button>
        </div>
      </div>
    );
  }

  const pos = positionOf(card);
  const gen = cutMethod(pos);
  const override = stats.cutNotes[String(pos)];
  const effective = override?.trim() ? override : gen.text;

  function next() {
    cancelSpeech();
    setCard(pick());
    setRevealed(false);
    setRound((r) => r + 1);
  }

  return (
    <div className="screen cut-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Cut to it</span>
        <span className="toolbar-spacer" />
      </div>

      <p className="prompt-text">Get to this card.</p>

      {!revealed && (
        <button
          type="button"
          className="prompt-toggle"
          onClick={() => {
            if (audioPrompt) cancelSpeech();
            setAudioPrompt((v) => !v);
          }}
        >
          {audioPrompt ? "switch to shown" : "switch to spoken"}
        </button>
      )}

      <div className="stimulus" key={`stim-${round}`}>
        {!revealed && audioPrompt ? (
          <button
            type="button"
            className="spoken-card"
            onClick={() => speak(cardName(card))}
            aria-label="Repeat the spoken card"
          >
            <span className="spoken-card-label">tap to repeat</span>
          </button>
        ) : (
          <PlayingCard card={card} size="large" />
        )}
      </div>

      {!revealed ? (
        <button
          type="button"
          className="btn btn-primary next-btn"
          onClick={() => {
            cancelSpeech();
            setRevealed(true);
          }}
        >
          Show me how
        </button>
      ) : (
        <div className="result" key={`res-${round}`}>
          <div className="cut-reveal">
            <span className="cut-pos">
              position {pos} · nearest {gen.anchorName}
            </span>
            <p className="cut-method">{effective}</p>
          </div>

          <label className="learn-field">
            <span className="learn-field-label">Your move (overrides the suggestion)</span>
            <input
              className="learn-input"
              type="text"
              value={override ?? ""}
              placeholder={gen.text}
              onChange={(e) => onSetCutNote(pos, e.target.value)}
            />
          </label>

          <button type="button" className="btn btn-primary next-btn" onClick={next}>
            Next card →
          </button>
        </div>
      )}
    </div>
  );
}
