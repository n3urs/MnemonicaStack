import { useState } from "react";
import { cardName, positionOf } from "../stack";
import { SELF_LOCATORS, namedCardRoute } from "../landmarks";
import { Ornament } from "../components/Ornament";
import { PlayingCard } from "../components/PlayingCard";
import { CardGrid } from "../components/AnswerGrids";

const LANDMARKS = [
  { pos: 1, card: "4C", role: "Top card" },
  { pos: 18, card: "KC", role: "K♣ crimp" },
  { pos: 35, card: "KH", role: "K♥ crimp" },
  { pos: 52, card: "9D", role: "Bottom (face) card" },
];

export function Toolkit({ onBack }: { onBack: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const route = picked ? namedCardRoute(positionOf(picked)) : null;

  return (
    <div className="screen toolkit-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Performance toolkit</span>
        <span className="toolbar-spacer" />
      </div>

      <p className="setup-intro">
        The working landmarks and the on-the-fly logic for getting any named card under control.
      </p>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">Key landmarks</h2>
        <p className="setup-text">
          Crimp the two Kings — K♣ at 18 and K♥ at 35 — as your quarter-deck anchors. With the free
          top and bottom cards, no card is ever more than 9 away from an anchor.
        </p>
        <div className="landmark-row">
          {LANDMARKS.map((l) => (
            <div key={l.pos} className="landmark-card">
              <PlayingCard card={l.card} size="small" />
              <span className="landmark-pos">pos {l.pos}</span>
              <span className="landmark-role">{l.role}</span>
            </div>
          ))}
        </div>
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">Self-locating cards</h2>
        <p className="setup-text">
          Three cards sit on their own number — the rank gives you the position outright.
        </p>
        <div className="landmark-row">
          {SELF_LOCATORS.map((s) => (
            <div key={s.card} className="landmark-card">
              <PlayingCard card={s.card} size="small" />
              <span className="landmark-pos">pos {s.pos}</span>
            </div>
          ))}
        </div>
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">The crimp system</h2>
        <p className="setup-text">
          A crimp is a tiny downward bend in a card's inner-left corner, so you can feel it and cut
          straight to it. Cutting to a crimp drops a <strong>known position</strong> at a known spot —
          no counting from the top.
        </p>
        <p className="setup-text">
          To find a freely-chosen card without a glimpse: spread, eye-count the gap from the
          selection to the nearest of the four anchors (top {`=`} 1, K♣ {`=`} 18, K♥ {`=`} 35, bottom{" "}
          {`=`} 52). The most you'll ever count is 9.
        </p>
      </section>

      <Ornament />

      <section className="setup-section">
        <h2 className="section-title">Named card → the top</h2>
        <p className="setup-text">
          Tap the card a spectator names. The route adapts to where it sits.
        </p>

        <div className="toolkit-picker">
          <CardGrid onSelect={setPicked} />
        </div>

        {picked && route && (
          <div className="route-result">
            <div className="route-head">
              <PlayingCard card={picked} size="small" />
              <div className="route-head-text">
                <span className="route-card-name">{cardName(picked)}</span>
                <span className="route-card-pos">position {route.position}</span>
              </div>
            </div>
            <p className="route-summary">{route.summary}</p>
            <ol className="route-steps">
              {route.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
