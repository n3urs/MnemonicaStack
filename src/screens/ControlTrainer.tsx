import { useEffect, useRef, useState } from "react";
import {
  controlAccuracy,
  selectLearnedCard,
  type ControlMode,
  type ControlRating,
  type Stats,
} from "../storage";
import { cardName, positionOf } from "../stack";
import { cutMethod } from "../cutting";
import { namedCardRoute, TPC_STEPS } from "../landmarks";
import { PlayingCard } from "../components/PlayingCard";
import { cancelSpeech, speak } from "../speech";

const TABS: { id: ControlMode; label: string }[] = [
  { id: "cutToPosition", label: "Cut to it" },
  { id: "controlToTop", label: "To the top" },
  { id: "tpc", label: "TPC drill" },
];

const RATINGS: { id: ControlRating; label: string }[] = [
  { id: "nailed", label: "Nailed it" },
  { id: "close", label: "1–2 off" },
  { id: "off", label: "Way off" },
];

export function ControlTrainer({
  stats,
  onSetCutNote,
  onRateControl,
  onBack,
  onLearn,
}: {
  stats: Stats;
  onSetCutNote: (position: number, value: string) => void;
  onRateControl: (mode: ControlMode, rating: ControlRating) => void;
  onBack: () => void;
  onLearn: () => void;
}) {
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const lastRef = useRef<string | undefined>(undefined);

  function pickCard(): string | null {
    const c = selectLearnedCard(statsRef.current, lastRef.current);
    if (!c) return null;
    lastRef.current = c;
    return c;
  }

  const [mode, setMode] = useState<ControlMode>("cutToPosition");
  const [card, setCard] = useState<string | null>(pickCard);
  const [revealed, setRevealed] = useState(false);
  const [round, setRound] = useState(0);
  const [audioPrompt, setAudioPrompt] = useState(false);

  const isCardMode = mode === "cutToPosition" || mode === "controlToTop";

  // Lock body scroll for the card modes (they fit the viewport); let the TPC
  // step list scroll. This screen owns its own scroll lock — App doesn't.
  useEffect(() => {
    document.body.classList.toggle("no-scroll", isCardMode);
    return () => document.body.classList.remove("no-scroll");
  }, [isCardMode]);

  // Speak the card when audio mode is on and a fresh card appears.
  useEffect(() => {
    if (isCardMode && audioPrompt && card) speak(cardName(card));
  }, [card, audioPrompt, isCardMode]);

  useEffect(() => () => cancelSpeech(), []);

  function switchMode(m: ControlMode) {
    cancelSpeech();
    setMode(m);
    setRevealed(false);
    if ((m === "cutToPosition" || m === "controlToTop") && !card) setCard(pickCard());
  }

  function rate(r: ControlRating) {
    onRateControl(mode, r);
    cancelSpeech();
    if (isCardMode) {
      setCard(pickCard());
      setRevealed(false);
    }
    setRound((n) => n + 1);
    window.scrollTo(0, 0);
  }

  const acc = controlAccuracy(stats.control[mode]);
  const attempts = stats.control[mode].attempts;

  const tabs = (
    <div className="control-tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`control-tab ${mode === t.id ? "is-active" : ""}`}
          onClick={() => switchMode(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const accLine = (
    <p className="control-acc">
      {acc === null ? "No attempts yet" : `${acc}% nailed`}
      <span className="control-acc-sub"> · {attempts} {attempts === 1 ? "try" : "tries"}</span>
    </p>
  );

  const rateRow = (
    <div className="rate-row">
      <span className="rate-label">How did that go?</span>
      <div className="rate-buttons">
        {RATINGS.map((r) => (
          <button key={r.id} type="button" className={`rate-btn rate-${r.id}`} onClick={() => rate(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );

  // ---- TPC mode: static steps, always-available self-rate ----
  if (mode === "tpc") {
    return (
      <div className="screen control-screen">
        <div className="toolbar">
          <button type="button" className="btn-link" onClick={onBack}>
            ← Back
          </button>
          <span className="toolbar-title">Control a card</span>
          <span className="toolbar-spacer" />
        </div>
        {tabs}
        {accLine}
        <p className="prompt-text">Tamariz Perpendicular Control</p>
        <p className="control-blurb">
          Secretly pivot one card 90° inside the deck, hide it, then carry it anywhere — usually to
          the bottom, where one cut brings it on top. The other 51 cards never move.
        </p>
        <ol className="tpc-steps">
          {TPC_STEPS.map((s, i) => (
            <li key={i} className="tpc-step">
              <span className="tpc-step-num">{i + 1}</span>
              <span className="tpc-step-body">
                <span className="tpc-step-title">{s.title}</span>
                <span className="tpc-step-detail">{s.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        {rateRow}
      </div>
    );
  }

  // ---- Card modes: empty state if nothing learned ----
  if (!card) {
    return (
      <div className="screen control-screen">
        <div className="toolbar">
          <button type="button" className="btn-link" onClick={onBack}>
            ← Back
          </button>
          <span className="toolbar-title">Control a card</span>
          <span className="toolbar-spacer" />
        </div>
        {tabs}
        <div className="empty-drill">
          <div className="ornament" aria-hidden="true">
            <span className="orn-black">♠</span>
            <span className="orn-red">♥</span>
            <span className="orn-red">♦</span>
            <span className="orn-black">♣</span>
          </div>
          <p className="empty-drill-text">
            This mode quizzes cards you've learned. Study a few in the learn screen, or try the TPC
            drill above — it doesn't need any.
          </p>
          <button type="button" className="btn btn-primary" onClick={onLearn}>
            Go to learn
          </button>
        </div>
      </div>
    );
  }

  const pos = positionOf(card);
  const promptText = mode === "cutToPosition" ? "Cut your deck to this card." : "Bring this card to the top.";

  // Build the reveal body for the active card mode.
  let revealBody: React.ReactNode;
  if (mode === "cutToPosition") {
    const gen = cutMethod(pos);
    const override = stats.cutNotes[String(pos)];
    const effective = override?.trim() ? override : gen.text;
    revealBody = (
      <div className="control-reveal">
        <span className="cut-pos">
          position {pos} · nearest {gen.anchorName}
        </span>
        <p className="cut-method">{effective}</p>
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
      </div>
    );
  } else {
    const route = namedCardRoute(pos);
    revealBody = (
      <div className="control-reveal">
        <span className="cut-pos">
          position {pos} · {route.summary}
        </span>
        <ol className="route-steps">
          {route.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="screen control-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Control a card</span>
        <span className="toolbar-spacer" />
      </div>

      {tabs}
      {accLine}

      <p className="prompt-text">{promptText}</p>

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
          {mode === "cutToPosition" ? "Show me the cut" : "Show me the route"}
        </button>
      ) : (
        <div className="result" key={`res-${round}`}>
          {revealBody}
          {rateRow}
        </div>
      )}
    </div>
  );
}
