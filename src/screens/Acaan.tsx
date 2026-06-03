import { useEffect, useRef, useState } from "react";
import { selectLearnedCard, type Stats } from "../storage";
import { cardAt, cardName, positionOf } from "../stack";
import { PlayingCard } from "../components/PlayingCard";
import { NumberGrid } from "../components/AnswerGrids";
import { celebrate } from "../haptics";
import { ding, dud } from "../audio";

type Phase = "answering" | "answered" | "revealed";

interface Q {
  card: string;
  position: number; // stack position of the card
  number: number; // the spectator's named number, 1..52
  cut: number; // correct cut from the top, 0..51
}

// The cut that lands the card at the named number when you deal down: take the
// card's stack position P and the number N, then cut (P − N) mod 52 off the top
// and complete the cut. Dealing N cards then puts the card Nth (last dealt).
function buildQ(card: string, number: number): Q {
  const position = positionOf(card);
  const cut = (((position - number) % 52) + 52) % 52;
  return { card, position, number, cut };
}

export function Acaan({
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

  function pick(): Q | null {
    const card = selectLearnedCard(statsRef.current, lastRef.current);
    if (!card) return null;
    lastRef.current = card;
    const number = 1 + Math.floor(Math.random() * 52);
    return buildQ(card, number);
  }

  const [q, setQ] = useState<Q | null>(pick);
  const [phase, setPhase] = useState<Phase>("answering");
  const [choice, setChoice] = useState<number | null>(null);
  const [session, setSession] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(0);

  function submit(value: number) {
    if (phase !== "answering" || !q) return;
    const correct = value === q.cut;
    setChoice(value);
    setPhase("answered");
    setSession((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setStreak((n) => (correct ? n + 1 : 0));
    if (correct) {
      celebrate();
      ding();
    } else {
      dud();
    }
  }

  function next() {
    setQ(pick());
    setChoice(null);
    setPhase("answering");
    setRound((r) => r + 1);
  }

  // Tap anywhere to continue once answered/revealed.
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

  if (!q) {
    return (
      <div className="screen drill acaan-screen">
        <div className="toolbar">
          <button type="button" className="btn-link" onClick={(e) => { e.stopPropagation(); onBack(); }}>
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
          <p className="empty-drill-text">
            ACAAN works out the cut from a card's position, so you need cards you've learned. Study a
            few first.
          </p>
          <button type="button" className="btn btn-primary" onClick={onLearn}>
            Go to learn
          </button>
        </div>
      </div>
    );
  }

  const correct = choice === q.cut;
  const banner =
    phase === "revealed"
      ? { text: "The cut", cls: "is-neutral" }
      : correct
        ? { text: "Correct", cls: "is-correct" }
        : { text: "Not quite", cls: "is-wrong" };
  const diff = q.position - q.number; // may be negative
  const bottomCut = (52 - q.cut) % 52;
  // After cutting `cut` cards from the top to the bottom, the deck reads
  // C+1, C+2, …, 52, 1, …, C. So the new top is stack position C+1 and the new
  // bottom (the card you can glimpse to check) is stack position C — or 52 if
  // there was no cut.
  const topCard = cardAt(q.cut + 1);
  const bottomCard = cardAt(q.cut === 0 ? 52 : q.cut);

  return (
    <div className="screen drill acaan-screen">
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
          <span className="ts-value">{streak}</span>
          <span className="ts-label">Streak</span>
        </div>
      </div>

      <p className="prompt-text">How many to cut so it deals to their number?</p>

      {phase === "answering" ? (
        <>
          <div className="stimulus acaan-stim" key={round}>
            <PlayingCard card={q.card} size="medium" />
            <span className="acaan-arrow" aria-hidden="true">→</span>
            <div className="acaan-target">
              <span className="acaan-target-num">{q.number}</span>
              <span className="acaan-target-label">their number</span>
            </div>
          </div>
          <NumberGrid onSelect={submit} count={52} start={0} />
          <button
            type="button"
            className="btn-link reveal-link"
            onClick={() => setPhase("revealed")}
          >
            Show the working
          </button>
        </>
      ) : (
        <div className={`result ${correct && phase === "answered" ? "is-correct" : ""}`} key={round}>
          <div className={`result-banner ${banner.cls}`}>{banner.text}</div>
          {correct && phase === "answered" && (
            <div className="celebrate" aria-hidden="true">
              <span className="orn-black">♠</span>
              <span className="orn-red">♥</span>
              <span className="orn-red">♦</span>
              <span className="orn-black">♣</span>
            </div>
          )}

          <div className="acaan-answer">
            <span className="acaan-answer-cut">
              cut {q.cut}
              <span className="acaan-answer-from"> from the top</span>
            </span>
            {q.cut > 26 && (
              <span className="acaan-answer-alt">or cut {bottomCut} from the bottom</span>
            )}
          </div>

          <div className="acaan-peek">
            <div className="acaan-peek-item">
              <PlayingCard card={topCard} size="small" />
              <span className="acaan-peek-label">new top</span>
            </div>
            <div className="acaan-peek-item is-key">
              <PlayingCard card={bottomCard} size="small" />
              <span className="acaan-peek-label">bottom — peek to check</span>
            </div>
          </div>

          <div className="acaan-working">
            <p className="acaan-working-line">
              {cardName(q.card)} sits at <strong>{q.position}</strong>.
            </p>
            <p className="acaan-working-line">
              {q.position} − {q.number} = {diff}
              {diff < 0 && ` (+52 = ${q.cut})`} → cut <strong>{q.cut}</strong>, then deal {q.number}.
            </p>
            <p className="acaan-working-sub">
              {q.cut === 0
                ? "It's already at their number — no cut needed."
                : `Their card ends up as the ${ordinal(q.number)} card you deal.`}
            </p>
          </div>

          {phase === "answered" && !correct && (
            <p className="your-choice">You cut {choice}</p>
          )}
          <p className="tap-hint">Tap anywhere to continue</p>
        </div>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
