import { useEffect, useRef, useState } from "react";
import { learnedCount, selectLearnedCard, type Stats } from "../storage";
import { cardName, positionOf } from "../stack";
import { cancelSpeech, speakAsync } from "../speech";
import { PlayingCard } from "../components/PlayingCard";
import { PositionDisplay } from "../components/PositionDisplay";

// Hands-free drill: speaks a prompt, leaves you a thinking gap, speaks the
// answer, then moves on — looping until you stop it. For practising while
// walking, shuffling, or otherwise not looking at the screen.

type Direction = "cardFirst" | "posFirst";
const GAPS = [3, 5, 8];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AudioDrill({
  stats,
  onBack,
  onLearn,
}: {
  stats: Stats;
  onBack: () => void;
  onLearn: () => void;
}) {
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const lastRef = useRef<string | undefined>(undefined);

  const [running, setRunning] = useState(false);
  const [gap, setGap] = useState(5);
  const [direction, setDirection] = useState<Direction>("cardFirst");
  const [count, setCount] = useState(0);
  const [current, setCurrent] = useState<{ card: string; revealed: boolean } | null>(null);

  // Bump runId to cancel an in-flight loop; the loop checks it after each await.
  const runIdRef = useRef(0);
  const gapRef = useRef(gap);
  gapRef.current = gap;
  const dirRef = useRef(direction);
  dirRef.current = direction;

  const learned = learnedCount(stats);

  function stop() {
    runIdRef.current++;
    setRunning(false);
    cancelSpeech();
  }

  // Stop on unmount and when the app backgrounds (TTS gets killed anyway).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      runIdRef.current++;
      cancelSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    const id = ++runIdRef.current;
    setRunning(true);
    setCount(0);
    while (runIdRef.current === id) {
      const card = selectLearnedCard(statsRef.current, lastRef.current);
      if (!card) break;
      lastRef.current = card;
      const pos = positionOf(card);
      const [prompt, answer] =
        dirRef.current === "cardFirst"
          ? [cardName(card), `position ${pos}`]
          : [`position ${pos}`, cardName(card)];

      setCurrent({ card, revealed: false });
      await speakAsync(prompt);
      if (runIdRef.current !== id) return;
      await sleep(gapRef.current * 1000);
      if (runIdRef.current !== id) return;
      setCurrent({ card, revealed: true });
      await speakAsync(answer);
      if (runIdRef.current !== id) return;
      setCount((c) => c + 1);
      await sleep(1800);
    }
  }

  const toolbar = (
    <div className="toolbar">
      <button
        type="button"
        className="btn-link"
        onClick={() => {
          stop();
          onBack();
        }}
      >
        ← Back
      </button>
      <span className="toolbar-title">Hands-free</span>
      <span className="toolbar-spacer" />
    </div>
  );

  if (learned === 0) {
    return (
      <div className="screen audio-screen">
        {toolbar}
        <div className="empty-drill">
          <div className="ornament" aria-hidden="true">
            <span className="orn-black">♠</span>
            <span className="orn-red">♥</span>
            <span className="orn-red">♦</span>
            <span className="orn-black">♣</span>
          </div>
          <p className="empty-drill-text">
            The hands-free drill speaks cards you've learned. Study a few first, then practise with
            your eyes on the deck instead of the screen.
          </p>
          <button type="button" className="btn btn-primary" onClick={onLearn}>
            Go to learn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen audio-screen">
      {toolbar}

      <p className="prompt-text">
        {direction === "cardFirst" ? "Hear a card, recall its position." : "Hear a position, recall its card."}
      </p>
      <p className="session-sub">
        It speaks, waits {gap}s while you think, then speaks the answer — and loops. Screen
        optional.
      </p>

      {!running ? (
        <>
          <div className="audio-controls">
            <span className="learn-field-label">Thinking gap</span>
            <div className="audio-chips">
              {GAPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`audio-chip ${gap === g ? "is-active" : ""}`}
                  onClick={() => setGap(g)}
                >
                  {g}s
                </button>
              ))}
            </div>
            <span className="learn-field-label">Direction</span>
            <div className="audio-chips">
              <button
                type="button"
                className={`audio-chip ${direction === "cardFirst" ? "is-active" : ""}`}
                onClick={() => setDirection("cardFirst")}
              >
                card → position
              </button>
              <button
                type="button"
                className={`audio-chip ${direction === "posFirst" ? "is-active" : ""}`}
                onClick={() => setDirection("posFirst")}
              >
                position → card
              </button>
            </div>
          </div>
          <button type="button" className="btn btn-primary session-begin" onClick={() => void start()}>
            ▶ Start speaking
          </button>
          {count > 0 && <p className="session-sub">{count} spoken last session</p>}
        </>
      ) : (
        <>
          <div className="audio-now">
            {current && (
              <div className="stimulus" key={current.card + String(current.revealed)}>
                {direction === "cardFirst" || current.revealed ? (
                  <PlayingCard card={current.card} size="medium" />
                ) : (
                  <PositionDisplay position={positionOf(current.card)} size="medium" />
                )}
              </div>
            )}
            {current?.revealed && (
              <p className="audio-answer">
                {cardName(current.card)} · position {positionOf(current.card)}
              </p>
            )}
            <p className="session-sub">{count} spoken · listening practice in progress</p>
          </div>
          <button type="button" className="btn btn-danger session-begin" onClick={stop}>
            ■ Stop
          </button>
        </>
      )}
    </div>
  );
}
