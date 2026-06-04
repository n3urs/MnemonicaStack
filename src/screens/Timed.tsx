import { useEffect, useRef, useState } from "react";
import { learnedCount, selectSessionCards, type Stats, type TimedMode } from "../storage";
import { positionOf } from "../stack";
import { countBeep, dud, goBeep, primeAudio } from "../audio";
import { PlayingCard } from "../components/PlayingCard";
import { NumberGrid } from "../components/AnswerGrids";
import { TimedChart } from "../components/TimedChart";

type Phase = "ready" | "countdown" | "running" | "done";

function fmt(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

export function Timed({
  mode,
  stats,
  onComplete,
  onRetire,
  onBack,
  onLearn,
}: {
  mode: TimedMode;
  stats: Stats;
  onComplete: (avgSeconds: number, mode: TimedMode) => void;
  onRetire: (mode: TimedMode) => void;
  onBack: () => void;
  onLearn: () => void;
}) {
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const isPosition = mode === "position";
  const runSize = isPosition ? 10 : 5;
  const best = isPosition ? stats.timedPosBest : stats.timedBest;
  const history = isPosition ? stats.timedPosHistory : stats.timedHistory;

  const [phase, setPhase] = useState<Phase>("ready");
  const [cards, setCards] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<{ total: number; avg: number; isPB: boolean } | null>(null);

  const startRef = useRef(0);
  const lastTapRef = useRef(0);
  const learned = learnedCount(stats);

  // Lock scroll during the active run so nothing shifts under the finger.
  useEffect(() => {
    const lock = phase === "countdown" || phase === "running";
    document.body.classList.toggle("no-scroll", lock);
    return () => document.body.classList.remove("no-scroll");
  }, [phase]);

  // Countdown 3 → 2 → 1 → go, with Formula-One-style beeps.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      goBeep();
      startRef.current = performance.now();
      setNow(startRef.current);
      setIdx(0);
      setPhase("running");
      return;
    }
    countBeep();
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Live clock while running.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [phase]);

  function startRun() {
    const picked = selectSessionCards(statsRef.current, runSize);
    if (picked.length === 0) return;
    primeAudio(); // warm the audio context inside this tap so the beeps fire
    setCards(picked);
    setResult(null);
    setCount(3);
    setPhase("countdown");
  }

  function abandonRun() {
    setResult(null);
    setPhase("ready");
  }

  function discardResult() {
    onRetire(mode);
    setResult(null);
    setPhase("ready");
  }

  function finish() {
    const total = (performance.now() - startRef.current) / 1000;
    const avg = total / cards.length;
    const prevBest = isPosition ? statsRef.current.timedPosBest : statsRef.current.timedBest;
    const isPB = prevBest === null || avg < prevBest;
    setResult({ total, avg, isPB });
    setPhase("done");
    onComplete(avg, mode);
  }

  function advance() {
    if (idx < cards.length - 1) setIdx((i) => i + 1);
    else finish();
  }

  // Cut mode: tap anywhere advances. Position mode: tap the position; correct
  // advances, wrong buzzes and stays.
  function answerPosition(n: number) {
    if (n === positionOf(cards[idx])) advance();
    else dud();
  }

  // Tap-anywhere listener — cut mode only.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (phase !== "running" || isPosition) return;
    const handler = () => {
      const t = Date.now();
      if (t - lastTapRef.current < 250) return;
      lastTapRef.current = t;
      advanceRef.current();
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [phase, isPosition]);

  const title = isPosition ? "Timed recall" : "Timed cut";
  const toolbar = (
    <div className="toolbar">
      <button type="button" className="btn-link" onClick={onBack}>
        ← Back
      </button>
      <span className="toolbar-title">{title}</span>
      <span className="toolbar-spacer" />
    </div>
  );

  // ---------- READY ----------
  if (phase === "ready") {
    return (
      <div className="screen timed-screen">
        {toolbar}
        {learned < runSize ? (
          <div className="empty-drill">
            <div className="ornament" aria-hidden="true">
              <span className="orn-black">♠</span>
              <span className="orn-red">♥</span>
              <span className="orn-red">♦</span>
              <span className="orn-black">♣</span>
            </div>
            <p className="empty-drill-text">
              This timed run draws from cards you've learned — study at least {runSize} first.
            </p>
            <button type="button" className="btn btn-primary" onClick={onLearn}>
              Go to learn
            </button>
          </div>
        ) : (
          <div className="timed-ready">
            <p className="prompt-text">
              {isPosition
                ? `Name the position of ${runSize} cards as fast as you can.`
                : `Cut to ${runSize} cards as fast as you can.`}
            </p>
            <p className="session-sub">
              {isPosition
                ? `A card appears, you tap its position. Get it right and the next shows — the clock runs across all ${runSize}.`
                : `A card appears, you cut to it, hit Found it, and the next shows. The clock runs across all ${runSize}.`}
            </p>
            <div className="timed-best-badge">
              {best === null ? (
                <span className="timed-best-none">No time yet — set the first.</span>
              ) : (
                <>
                  <span className="timed-best-value">{fmt(best)}</span>
                  <span className="timed-best-label">your best per card</span>
                </>
              )}
            </div>
            <TimedChart runs={history} />
            <button type="button" className="btn btn-primary session-begin" onClick={startRun}>
              Start
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------- COUNTDOWN ----------
  if (phase === "countdown") {
    return (
      <div className="screen timed-screen">
        {toolbar}
        <div className="timed-countdown">
          <span className="countdown-num" key={count}>
            {count > 0 ? count : "Go"}
          </span>
          <span className="countdown-sub">get ready</span>
        </div>
      </div>
    );
  }

  // ---------- DONE ----------
  if (phase === "done" && result) {
    return (
      <div className="screen timed-screen">
        {toolbar}
        <div className="timed-done">
          {result.isPB && <div className="timed-pb">⚡ New personal best</div>}
          <div className="timed-result">
            <span className="timed-result-avg">{fmt(result.avg)}</span>
            <span className="timed-result-label">per card</span>
          </div>
          <p className="session-sub">
            {fmt(result.total)} total for {cards.length} cards
            {!result.isPB && best !== null && ` · best ${fmt(best)}`}
          </p>
          <TimedChart runs={history} />
          <div className="session-actions">
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              Done
            </button>
            <button type="button" className="btn btn-primary" onClick={startRun}>
              Go again
            </button>
          </div>
          <button type="button" className="btn-link timed-discard" onClick={discardResult}>
            Distracted? Discard this run
          </button>
        </div>
      </div>
    );
  }

  // ---------- RUNNING ----------
  const elapsed = Math.max(0, (now - startRef.current) / 1000);

  // Position mode: drill-style layout with a number grid (uses the drill's
  // viewport-fit so the grid stays reachable).
  if (isPosition) {
    return (
      <div className="screen drill timed-pos-run">
        <div className="toolbar">
          <button type="button" className="btn-link" onClick={onBack}>
            ← Back
          </button>
          <div className="toolbar-stat">
            <span className="ts-value">{elapsed.toFixed(1)}s</span>
            <span className="ts-label">Clock</span>
          </div>
          <div className="toolbar-stat">
            <span className="ts-value">
              {idx + 1} / {cards.length}
            </span>
            <span className="ts-label">Card</span>
          </div>
          <button type="button" className="btn-link timed-retire" onClick={abandonRun}>
            Retire
          </button>
        </div>
        <p className="prompt-text">Which position holds this card?</p>
        <div className="stimulus" key={idx}>
          <PlayingCard card={cards[idx]} size="large" />
        </div>
        <NumberGrid onSelect={answerPosition} />
      </div>
    );
  }

  // Cut mode: big centred clock, tap anywhere to advance.
  return (
    <div className="screen timed-screen timed-running">
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
        <button
          type="button"
          className="btn-link timed-retire"
          onClick={(e) => {
            e.stopPropagation();
            abandonRun();
          }}
        >
          Retire
        </button>
      </div>

      <div className="timed-run-body">
        <span className="timed-clock-big">{elapsed.toFixed(1)}s</span>
        <span className="timed-clock-count">
          card {idx + 1} / {cards.length}
        </span>
        <div className="stimulus" key={idx}>
          <PlayingCard card={cards[idx]} size="large" />
        </div>
        <p className="tap-hint">tap anywhere for the next</p>
      </div>
    </div>
  );
}
