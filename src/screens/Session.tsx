import { useEffect, useRef, useState } from "react";
import { learnedCount, selectSessionCards, type Stats } from "../storage";
import { positionOf } from "../stack";
import { defaultCardImage, positionPeg } from "../mnemonics";
import { PlayingCard } from "../components/PlayingCard";
import { PositionDisplay } from "../components/PositionDisplay";
import { NumberGrid } from "../components/AnswerGrids";
import { celebrate } from "../haptics";
import { ding, dud } from "../audio";

type Phase = "config" | "run" | "summary";
const SIZES = [10, 20, 30];

export function Session({
  stats,
  onRecord,
  onBack,
  onLearn,
}: {
  stats: Stats;
  onRecord: (card: string, correct: boolean) => void;
  onBack: () => void;
  onLearn: () => void;
}) {
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const [phase, setPhase] = useState<Phase>("config");
  const [size, setSize] = useState(20);

  const [main, setMain] = useState<string[]>([]); // the chosen cards, in order
  const [mainIdx, setMainIdx] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({}); // first-try right?

  const [mistakeMode, setMistakeMode] = useState(false);
  const [mqueue, setMqueue] = useState<string[]>([]); // cards left to clear

  const [answered, setAnswered] = useState<{ correct: boolean; choice: number } | null>(null);
  const [round, setRound] = useState(0);

  const learned = learnedCount(stats);

  // Lock body scroll only during the drill itself — config and summary may be
  // taller than the viewport.
  useEffect(() => {
    document.body.classList.toggle("no-scroll", phase === "run");
    return () => document.body.classList.remove("no-scroll");
  }, [phase]);

  const currentCard = mistakeMode ? mqueue[0] : main[mainIdx];

  function begin() {
    const cards = selectSessionCards(statsRef.current, size);
    if (cards.length === 0) return;
    setMain(cards);
    setMainIdx(0);
    setResults({});
    setMistakeMode(false);
    setMqueue([]);
    setAnswered(null);
    setRound(0);
    setPhase("run");
  }

  function startMistakes(missed: string[]) {
    setMistakeMode(true);
    setMqueue(missed);
    setAnswered(null);
    setRound((n) => n + 1);
    setPhase("run");
  }

  function answer(num: number) {
    if (answered || !currentCard) return;
    const correct = num === positionOf(currentCard);
    onRecord(currentCard, correct);
    if (correct) {
      celebrate();
      ding();
    } else {
      dud();
    }
    if (!mistakeMode) setResults((r) => ({ ...r, [currentCard]: correct }));
    setAnswered({ correct, choice: num });
  }

  function cont() {
    if (!answered) return;
    const wasCorrect = answered.correct;
    setAnswered(null);
    setRound((n) => n + 1);
    if (!mistakeMode) {
      const nextIdx = mainIdx + 1;
      if (nextIdx >= main.length) setPhase("summary");
      else setMainIdx(nextIdx);
    } else {
      setMqueue((q) => {
        const [head, ...rest] = q;
        const nq = wasCorrect ? rest : [...rest, head];
        if (nq.length === 0) setPhase("summary");
        return nq;
      });
    }
  }

  // Tap anywhere to continue once a question is answered.
  const contRef = useRef(cont);
  contRef.current = cont;
  useEffect(() => {
    if (!answered) return;
    const handler = () => contRef.current();
    const id = window.setTimeout(() => window.addEventListener("click", handler), 100);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", handler);
    };
  }, [answered]);

  const toolbar = (
    <div className="toolbar">
      <button
        type="button"
        className="btn-link"
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
      >
        ← Back
      </button>
      <span className="toolbar-title">Today's session</span>
      <span className="toolbar-spacer" />
    </div>
  );

  // ---------- CONFIG ----------
  if (phase === "config") {
    return (
      <div className="screen session-screen">
        {toolbar}
        {learned === 0 ? (
          <div className="empty-drill">
            <div className="ornament" aria-hidden="true">
              <span className="orn-black">♠</span>
              <span className="orn-red">♥</span>
              <span className="orn-red">♦</span>
              <span className="orn-black">♣</span>
            </div>
            <p className="empty-drill-text">
              A session drills cards you've learned. Study a few first, then come back.
            </p>
            <button type="button" className="btn btn-primary" onClick={onLearn}>
              Go to learn
            </button>
          </div>
        ) : (
          <div className="session-config">
            <p className="prompt-text">How many cards?</p>
            <p className="session-sub">
              A focused run, weighted toward the cards you find hardest.
              {learned < Math.max(...SIZES) && ` You've learned ${learned} so far.`}
            </p>
            <div className="size-row">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`size-btn ${size === s ? "is-active" : ""}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary session-begin" onClick={begin}>
              Begin{learned < size ? ` (${learned})` : ""}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------- SUMMARY ----------
  if (phase === "summary") {
    if (mistakeMode) {
      return (
        <div className="screen session-screen">
          {toolbar}
          <div className="session-done">
            <div className="session-done-mark">✓</div>
            <h2 className="section-title">Mistakes cleared</h2>
            <p className="session-sub">Every card you missed is now answered correctly.</p>
            <div className="session-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("config")}>
                New session
              </button>
              <button type="button" className="btn btn-primary" onClick={onBack}>
                Done
              </button>
            </div>
          </div>
        </div>
      );
    }

    const right = main.filter((c) => results[c]);
    const missed = main.filter((c) => !results[c]);
    return (
      <div className="screen session-screen">
        {toolbar}
        <div className="session-summary">
          <div className="session-score">
            <span className="session-score-big">
              {right.length} / {main.length}
            </span>
            <span className="session-score-label">right first try</span>
          </div>

          {missed.length === 0 ? (
            <p className="session-sub session-perfect">Clean sweep — no misses. 🎩</p>
          ) : (
            <>
              <h2 className="section-title">Missed — with their hooks</h2>
              <div className="session-missed">
                {missed.map((card) => {
                  const pos = positionOf(card);
                  const peg = stats.pegs[String(pos)]?.trim() || positionPeg(pos);
                  const image = stats.notes[card]?.image?.trim() || defaultCardImage(card);
                  return (
                    <div key={card} className="session-missed-row">
                      <PlayingCard card={card} size="small" />
                      <div className="session-missed-info">
                        <span className="session-missed-pos">pos {pos}</span>
                        <span className="session-missed-hook">
                          {peg} &amp; {image}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="session-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPhase("config")}>
              New session
            </button>
            {missed.length > 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => startMistakes(missed)}>
                Drill my mistakes
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onBack}>
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- RUN ----------
  const total = mistakeMode ? null : main.length;
  const progress = mistakeMode
    ? `${mqueue.length} left`
    : `${Math.min(mainIdx + 1, main.length)} / ${total}`;

  return (
    <div className="screen drill session-run">
      <div className="toolbar">
        <button
          type="button"
          className="btn-link"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
        >
          ← Back
        </button>
        <div className="toolbar-stat">
          <span className="ts-value">{progress}</span>
          <span className="ts-label">{mistakeMode ? "Mistakes" : "Session"}</span>
        </div>
        <span className="toolbar-spacer" />
      </div>

      <p className="prompt-text">Which position holds this card?</p>

      {!answered ? (
        <>
          <div className="stimulus" key={round}>
            <PlayingCard card={currentCard} size="large" />
          </div>
          <NumberGrid onSelect={answer} />
        </>
      ) : (
        <div className={`result ${answered.correct ? "is-correct" : ""}`} key={round}>
          <div className={`result-banner ${answered.correct ? "is-correct" : "is-wrong"}`}>
            {answered.correct ? "Correct" : "Not quite"}
          </div>
          {answered.correct && (
            <div className="celebrate" aria-hidden="true">
              <span className="orn-black">♠</span>
              <span className="orn-red">♥</span>
              <span className="orn-red">♦</span>
              <span className="orn-black">♣</span>
            </div>
          )}
          <div className="reveal">
            <div className="reveal-item">
              <span className="reveal-label">Card</span>
              <PlayingCard card={currentCard} size="medium" />
            </div>
            <span className="reveal-arrow" aria-hidden="true">
              →
            </span>
            <div className="reveal-item">
              <span className="reveal-label">Position</span>
              <PositionDisplay position={positionOf(currentCard)} size="medium" />
            </div>
          </div>
          {!answered.correct && (
            <p className="your-choice">You chose {answered.choice}</p>
          )}
          <p className="tap-hint">Tap anywhere to continue</p>
        </div>
      )}
    </div>
  );
}
