import { useEffect, useRef, useState } from "react";
import { isWeakCard, learnedCount, selectLearnedCard, type Stats } from "../storage";
import { buildQuestion, needsSecondCard, type Mode, type Question } from "../quiz";
import { cardAt, cardName, positionOf } from "../stack";
import { defaultCardImage, positionPeg } from "../mnemonics";
import { PlayingCard } from "../components/PlayingCard";
import { PositionDisplay } from "../components/PositionDisplay";
import { CardGrid, NumberGrid } from "../components/AnswerGrids";
import { celebrate } from "../haptics";
import { ding, dud } from "../audio";
import { cancelSpeech, speak } from "../speech";

type Phase = "answering" | "answered" | "revealed";

// Which learned cards the drill draws from. Default is "all".
type Filter =
  | { type: "all" }
  | { type: "weak" }
  | { type: "range"; lo: number; hi: number };

const RANGE_PRESETS: { lo: number; hi: number }[] = [
  { lo: 1, hi: 13 },
  { lo: 14, hi: 26 },
  { lo: 27, hi: 39 },
  { lo: 40, hi: 52 },
];

function filterLabel(f: Filter): string {
  if (f.type === "all") return "All cards";
  if (f.type === "weak") return "Weak cards";
  return `Pos ${f.lo}–${f.hi}`;
}

function Stimulus({
  kind,
  card,
  position,
  size,
}: {
  kind: "card" | "position";
  card: string | null;
  position: number | null;
  size: "medium" | "large";
}) {
  if (kind === "card") return <PlayingCard card={card!} size={size} />;
  return <PositionDisplay position={position!} size={size} />;
}

export function Drill({
  mode,
  stats,
  onRecord,
  onBack,
  onLearn,
}: {
  mode: Mode;
  stats: Stats;
  onRecord: (card: string, correct: boolean) => void;
  onBack: () => void;
  onLearn: () => void;
}) {
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const lastRef = useRef<string | undefined>(undefined);

  const [filter, setFilter] = useState<Filter>({ type: "all" });
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const [filterOpen, setFilterOpen] = useState(false);

  // "How far apart" defaults to nearby pairs (≤ 6 apart) — the realistic
  // cut-miss range — with a toggle to allow any gap.
  const [distanceNear, setDistanceNear] = useState(true);
  const distanceRef = useRef(distanceNear);
  distanceRef.current = distanceNear;
  const NEAR_MAX = 6;

  function poolPredicate(): ((c: string) => boolean) | undefined {
    const f = filterRef.current;
    if (f.type === "all") return undefined;
    if (f.type === "weak") return (c) => isWeakCard(statsRef.current, c);
    return (c) => {
      const p = positionOf(c);
      return p >= f.lo && p <= f.hi;
    };
  }

  function pick(): Question | null {
    const pred = poolPredicate();
    const focus = selectLearnedCard(statsRef.current, lastRef.current, pred);
    if (!focus) return null;
    lastRef.current = focus;
    if (needsSecondCard(mode)) {
      // Distance needs a second, distinct learned card from the same pool —
      // and, by default, within NEAR_MAX positions of the focus card.
      const fp = positionOf(focus);
      const near = distanceRef.current;
      const secondPred = (c: string) => {
        if (pred && !pred(c)) return false;
        if (!near) return true;
        const d = Math.abs(positionOf(c) - fp);
        return d >= 1 && d <= NEAR_MAX;
      };
      const second = selectLearnedCard(statsRef.current, focus, secondPred);
      if (!second || second === focus) return null;
      return buildQuestion(mode, focus, second);
    }
    return buildQuestion(mode, focus);
  }

  function changeFilter(f: Filter) {
    filterRef.current = f; // sync so the next pick() uses it immediately
    setFilter(f);
    setQuestion(pick());
    setResult(null);
    setPhase("answering");
    setRound((r) => r + 1);
    setFilterOpen(false);
  }

  function toggleDistance() {
    const next = !distanceRef.current;
    distanceRef.current = next; // sync so the next pick() uses it immediately
    setDistanceNear(next);
    setQuestion(pick());
    setResult(null);
    setPhase("answering");
    setRound((r) => r + 1);
  }

  const [question, setQuestion] = useState<Question | null>(pick);
  const [phase, setPhase] = useState<Phase>("answering");
  // choice is the raw value the user pressed — a number for position-input drills,
  // a card string for card-input drills. We keep it raw so we can look up what it
  // *means* (the card at that position, or the position of that card) on a miss.
  const [result, setResult] = useState<{ correct: boolean; choice: number | string } | null>(null);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const [round, setRound] = useState(0);
  // Spoken-card mode: off by default each time you enter a drill.
  const [audioPrompt, setAudioPrompt] = useState(false);

  // Auto-speak the prompt card when audioPrompt is on and a new card appears.
  useEffect(() => {
    if (audioPrompt && question?.promptKind === "card" && question.promptCard) {
      speak(cardName(question.promptCard));
    }
  }, [question?.promptCard, audioPrompt]);

  // Cancel any in-progress speech when leaving the drill.
  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  function submit(correct: boolean, choice: number | string) {
    const q = question;
    if (!q) return;
    setResult({ correct, choice });
    setPhase("answered");
    setSession((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    onRecord(q.focusCard, correct);
    cancelSpeech();
    if (correct) {
      celebrate();
      ding();
    } else {
      dud();
    }
  }

  function handleNumber(n: number) {
    if (phase !== "answering" || !question) return;
    submit(n === question.answerNumber, n);
  }

  function handleCard(card: string) {
    if (phase !== "answering" || !question) return;
    submit(card === question.answerCard, card);
  }

  function reveal() {
    if (phase !== "answering") return;
    setPhase("revealed");
  }

  function next() {
    setQuestion(pick());
    setResult(null);
    setPhase("answering");
    setRound((r) => r + 1);
  }

  // "Tap anywhere to continue" — once the reveal is up, ANY click on the page
  // advances (including the empty letterboxing on wide screens, and the
  // safe-area padding below the result). Interactive elements that should NOT
  // advance (the back button, the sound-key tab) stop propagation themselves.
  // The 100ms defer makes sure the click that triggered the reveal doesn't
  // immediately fire next() too.
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (phase === "answering") return;
    const handler = () => nextRef.current();
    const id = window.setTimeout(() => window.addEventListener("click", handler), 100);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", handler);
    };
  }, [phase]);

  if (!question) {
    return (
      <div className="screen drill">
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
          <span className="toolbar-spacer" />
        </div>
        <div className="empty-drill">
          <div className="ornament" aria-hidden="true">
            <span className="orn-black">♠</span>
            <span className="orn-red">♥</span>
            <span className="orn-red">♦</span>
            <span className="orn-black">♣</span>
          </div>
          {learnedCount(stats) === 0 ? (
            <>
              <p className="empty-drill-text">
                You haven't learned any cards yet. Drills only quiz cards you've studied, so start
                in the learn screen and come back once you have a few.
              </p>
              <button type="button" className="btn btn-primary" onClick={onLearn}>
                Go to learn
              </button>
            </>
          ) : (
            <>
              <p className="empty-drill-text">
                No learned cards match the “{filterLabel(filter)}” filter
                {mode === "distance" ? " (this mode needs at least two)" : ""}.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => changeFilter({ type: "all" })}>
                Show all cards
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const banner =
    phase === "revealed"
      ? { text: "The answer", cls: "is-neutral" }
      : result?.correct
        ? { text: "Correct", cls: "is-correct" }
        : { text: "Not quite", cls: "is-wrong" };

  const hookPos = positionOf(question.focusCard);
  const hookPeg = stats.pegs[String(hookPos)]?.trim() || positionPeg(hookPos);
  const hookImage = stats.notes[question.focusCard]?.image?.trim() || defaultCardImage(question.focusCard);
  const hookLink = stats.notes[question.focusCard]?.link?.trim();

  return (
    <div className="screen drill">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <div className="toolbar-stat">
          <span className="ts-value">
            {session.correct} / {session.total}
          </span>
          <span className="ts-label">Session</span>
        </div>
        <div className="toolbar-stat">
          <span className="ts-value">{stats.currentStreak}</span>
          <span className="ts-label">Streak</span>
        </div>
      </div>

      <p className="prompt-text">{question.promptText}</p>

      {phase === "answering" ? (
        <>
          <div className="drill-controls">
            <button type="button" className="filter-pill" onClick={() => setFilterOpen(true)}>
              ⛃ {filterLabel(filter)}
            </button>
            {question.promptKind === "card" && !question.promptCardB && (
              <button
                type="button"
                className="prompt-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  if (audioPrompt) cancelSpeech();
                  setAudioPrompt((v) => !v);
                }}
              >
                {audioPrompt ? "switch to shown" : "switch to spoken"}
              </button>
            )}
            {question.mode === "distance" && (
              <button
                type="button"
                className="prompt-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDistance();
                }}
              >
                {distanceNear ? `within ${NEAR_MAX} · tap for any` : "any gap · tap for near"}
              </button>
            )}
          </div>
          <div className="stimulus" key={round}>
            {question.promptCardB ? (
              <div className="stimulus-pair">
                <PlayingCard card={question.promptCard!} size="medium" />
                <span className="pair-gap" aria-hidden="true">
                  ↔
                </span>
                <PlayingCard card={question.promptCardB} size="medium" />
              </div>
            ) : audioPrompt && question.promptKind === "card" && question.promptCard ? (
              <button
                type="button"
                className="spoken-card"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(cardName(question.promptCard!));
                }}
                aria-label={`Repeat the spoken card`}
              >
                <span className="spoken-card-label">tap to repeat</span>
              </button>
            ) : (
              <Stimulus
                kind={question.promptKind}
                card={question.promptCard}
                position={question.promptPosition}
                size="large"
              />
            )}
          </div>
          {question.inputKind === "number" ? (
            <NumberGrid
              onSelect={handleNumber}
              count={question.mode === "distance" ? (distanceNear ? NEAR_MAX : 51) : 52}
            />
          ) : (
            <CardGrid onSelect={handleCard} />
          )}
          <button type="button" className="btn-link reveal-link" onClick={reveal}>
            I don't remember
          </button>
        </>
      ) : (
        <div className={`result ${result?.correct ? "is-correct" : ""}`} key={round}>
          <div className={`result-banner ${banner.cls}`}>{banner.text}</div>
          {result?.correct && (
            <div className="celebrate" aria-hidden="true">
              <span className="orn-black">♠</span>
              <span className="orn-red">♥</span>
              <span className="orn-red">♦</span>
              <span className="orn-black">♣</span>
            </div>
          )}
          <div className="reveal">
            <div className="reveal-item">
              <span className="reveal-label">Prompt</span>
              {question.promptCardB ? (
                <div className="reveal-pair">
                  <PlayingCard card={question.promptCard!} size="small" />
                  <PlayingCard card={question.promptCardB} size="small" />
                </div>
              ) : (
                <Stimulus
                  kind={question.promptKind}
                  card={question.promptCard}
                  position={question.promptPosition}
                  size="medium"
                />
              )}
            </div>
            <span className="reveal-arrow" aria-hidden="true">
              →
            </span>
            <div className="reveal-item">
              <span className="reveal-label">{question.mode === "distance" ? "Apart" : "Answer"}</span>
              <Stimulus
                kind={question.inputKind === "number" ? "position" : "card"}
                card={question.answerCard}
                position={question.answerNumber}
                size="medium"
              />
            </div>
          </div>
          {question.mode === "distance" && (
            <p className="your-choice">
              {cardName(question.promptCard!)} is at {positionOf(question.promptCard!)}; {cardName(question.promptCardB!)} is at {positionOf(question.promptCardB!)}.
            </p>
          )}
          {phase === "answered" && result && !result.correct && question.mode !== "distance" && (
            <p className="your-choice">
              {typeof result.choice === "number" ? (
                <>
                  You chose {result.choice}
                  {question.mode === "cardToPosition" && (
                    <span className="your-choice-sub"> — which is {cardName(cardAt(result.choice))}</span>
                  )}
                </>
              ) : (
                <>
                  You chose {cardName(result.choice)}
                  <span className="your-choice-sub"> — position {positionOf(result.choice)}</span>
                </>
              )}
            </p>
          )}
          <div className="reveal-hook">
            <span className="reveal-hook-label">Memory hook</span>
            <span className="reveal-hook-pair">
              {hookPeg} &amp; {hookImage}
            </span>
            <span className="reveal-hook-sub">
              pos {hookPos} · {cardName(question.focusCard)}
            </span>
            {hookLink && <span className="reveal-hook-link">"{hookLink}"</span>}
          </div>
          <p className="tap-hint">Tap anywhere to continue</p>
        </div>
      )}

      {filterOpen && (
        <div className="filter-overlay" onClick={() => setFilterOpen(false)}>
          <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
            <span className="filter-title">Show which cards?</span>
            <button
              type="button"
              className={`filter-option ${filter.type === "all" ? "is-active" : ""}`}
              onClick={() => changeFilter({ type: "all" })}
            >
              All cards
            </button>
            <button
              type="button"
              className={`filter-option ${filter.type === "weak" ? "is-active" : ""}`}
              onClick={() => changeFilter({ type: "weak" })}
            >
              Weak cards
            </button>
            <span className="filter-subtitle">By position</span>
            <div className="filter-ranges">
              {RANGE_PRESETS.map((r) => {
                const active = filter.type === "range" && filter.lo === r.lo && filter.hi === r.hi;
                return (
                  <button
                    key={`${r.lo}-${r.hi}`}
                    type="button"
                    className={`filter-range ${active ? "is-active" : ""}`}
                    onClick={() => changeFilter({ type: "range", lo: r.lo, hi: r.hi })}
                  >
                    {r.lo}–{r.hi}
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn btn-ghost filter-close" onClick={() => setFilterOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
