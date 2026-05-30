import { useEffect, useRef, useState } from "react";
import { learnedCount, selectSessionCards, type Stats } from "../storage";
import { PlayingCard } from "../components/PlayingCard";

type Phase = "ready" | "countdown" | "running" | "done";

const RUN_SIZE = 5;

function fmt(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

export function Timed({
  stats,
  onComplete,
  onBack,
  onLearn,
}: {
  stats: Stats;
  onComplete: (avgSeconds: number) => void;
  onBack: () => void;
  onLearn: () => void;
}) {
  const statsRef = useRef(stats);
  statsRef.current = stats;

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

  // Countdown 3 → 2 → 1 → go.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      startRef.current = performance.now();
      setNow(startRef.current);
      setIdx(0);
      setPhase("running");
      return;
    }
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
    const picked = selectSessionCards(statsRef.current, RUN_SIZE);
    if (picked.length === 0) return;
    setCards(picked);
    setResult(null);
    setCount(3);
    setPhase("countdown");
  }

  function foundIt() {
    if (idx < cards.length - 1) {
      setIdx((i) => i + 1);
      return;
    }
    const total = (performance.now() - startRef.current) / 1000;
    const avg = total / cards.length;
    const prevBest = statsRef.current.timedBest;
    const isPB = prevBest === null || avg < prevBest;
    setResult({ total, avg, isPB });
    setPhase("done");
    onComplete(avg);
  }

  // Tap anywhere on the running screen to log the card and show the next. A
  // short debounce stops an accidental double-tap from skipping a card. The
  // Back button stops propagation so it doesn't count as a "found it".
  const foundRef = useRef(foundIt);
  foundRef.current = foundIt;
  useEffect(() => {
    if (phase !== "running") return;
    const handler = () => {
      const t = Date.now();
      if (t - lastTapRef.current < 250) return;
      lastTapRef.current = t;
      foundRef.current();
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [phase]);

  const toolbar = (
    <div className="toolbar">
      <button type="button" className="btn-link" onClick={onBack}>
        ← Back
      </button>
      <span className="toolbar-title">Timed run</span>
      <span className="toolbar-spacer" />
    </div>
  );

  // ---------- READY ----------
  if (phase === "ready") {
    return (
      <div className="screen timed-screen">
        {toolbar}
        {learned < RUN_SIZE ? (
          <div className="empty-drill">
            <div className="ornament" aria-hidden="true">
              <span className="orn-black">♠</span>
              <span className="orn-red">♥</span>
              <span className="orn-red">♦</span>
              <span className="orn-black">♣</span>
            </div>
            <p className="empty-drill-text">
              The timed run draws from cards you've learned — study at least {RUN_SIZE} first, then
              race the clock to cut to them.
            </p>
            <button type="button" className="btn btn-primary" onClick={onLearn}>
              Go to learn
            </button>
          </div>
        ) : (
          <div className="timed-ready">
            <p className="prompt-text">Cut to {RUN_SIZE} cards as fast as you can.</p>
            <p className="session-sub">
              A card appears, you cut to it in your deck, hit <em>Found it</em>, and the next one
              shows. The clock runs across all {RUN_SIZE}.
            </p>
            <div className="timed-best-badge">
              {stats.timedBest === null ? (
                <span className="timed-best-none">No time yet — set the first.</span>
              ) : (
                <>
                  <span className="timed-best-value">{fmt(stats.timedBest)}</span>
                  <span className="timed-best-label">your best per card</span>
                </>
              )}
            </div>
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
            {!result.isPB && stats.timedBest !== null && ` · best ${fmt(stats.timedBest)}`}
          </p>
          <div className="session-actions">
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              Done
            </button>
            <button type="button" className="btn btn-primary" onClick={startRun}>
              Go again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- RUNNING ----------
  const elapsed = Math.max(0, (now - startRef.current) / 1000);
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
