import { useState } from "react";
import { learnedCount, type Stats } from "../storage";
import { type Mode } from "../quiz";
import { MetricBox } from "../components/MetricBox";
import { Ornament } from "../components/Ornament";

export function Home({
  stats,
  onLearn,
  onStart,
  onSession,
  onAcaan,
  onStats,
  onReference,
  onSetup,
  onInsights,
  onSync,
  onToolkit,
  onTimed,
}: {
  stats: Stats;
  onLearn: () => void;
  onStart: (mode: Mode) => void;
  onSession: () => void;
  onAcaan: () => void;
  onStats: () => void;
  onReference: () => void;
  onSetup: () => void;
  onInsights: () => void;
  onSync: () => void;
  onToolkit: () => void;
  onTimed: () => void;
}) {
  const [posChooser, setPosChooser] = useState(false);
  const accuracy =
    stats.totalAnswered === 0 ? "—" : `${Math.round((stats.totalCorrect / stats.totalAnswered) * 100)}%`;
  const learned = learnedCount(stats);
  const bestPerCard = stats.timedBest === null ? "—" : `${stats.timedBest.toFixed(1)}s`;

  return (
    <div className="screen home">
      <header className="home-header">
        <h1 className="title">Mnemonica Trainer</h1>
        <p className="subtitle">
          <em>A daily drill for the memorised deck.</em>
        </p>
      </header>

      <div className="metric-grid metric-grid--5">
        <MetricBox label="Accuracy" value={accuracy} />
        <MetricBox label="Best run" value={stats.bestStreak} />
        <MetricBox label="Day streak" value={stats.dailyStreak} />
        <MetricBox label="Best/card" value={bestPerCard} />
        <MetricBox label="Answered" value={stats.totalAnswered} />
      </div>

      <Ornament />

      <button type="button" className="learn-cta" onClick={onLearn}>
        <span className="learn-cta-top">
          <span className="learn-cta-name">Learn the stack</span>
          <span className="learn-cta-count">{learned} / 52</span>
        </span>
        <span className="learn-cta-desc">
          {learned === 0
            ? "Start here — build the memory hooks before you drill."
            : learned < 52
              ? "Keep adding cards, or revisit the ones you've met."
              : "Whole stack learned — keep it sharp with the drills."}
        </span>
        <span className="learn-cta-bar">
          <span style={{ width: `${(learned / 52) * 100}%` }} />
        </span>
      </button>

      {learned > 0 && (
        <button type="button" className="session-cta" onClick={onSession}>
          <span className="session-cta-name">Today's session →</span>
          <span className="session-cta-desc">A focused run, then drill whatever you miss.</span>
        </button>
      )}

      <p className="eyebrow">Drills</p>
      <div className="mode-list">
        <button type="button" className="mode-button" onClick={() => setPosChooser(true)}>
          <span className="mode-name">Positions</span>
          <span className="mode-desc">Card ↔ position — pick which way after you tap.</span>
        </button>
        <button type="button" className="mode-button" onClick={() => onStart("neighbour")}>
          <span className="mode-name">Next or before</span>
          <span className="mode-desc">See a card, name the one just before or after it.</span>
        </button>
        <button type="button" className="mode-button" onClick={() => onStart("distance")}>
          <span className="mode-name">How far apart</span>
          <span className="mode-desc">See two cards, count the gap between them.</span>
        </button>
        <button type="button" className="mode-button" onClick={onTimed}>
          <span className="mode-name">Timed run</span>
          <span className="mode-desc">Race the clock cutting to 5 cards; beat your best time.</span>
        </button>
        <button type="button" className="mode-button" onClick={onAcaan}>
          <span className="mode-name">ACAAN cut</span>
          <span className="mode-desc">Work out the cut so a named card deals to any number.</span>
        </button>
      </div>

      <Ornament />

      <div className="secondary-actions">
        <button type="button" className="btn btn-ghost" onClick={onReference}>
          See the full stack
        </button>
        <button type="button" className="btn btn-ghost" onClick={onToolkit}>
          Performance toolkit
        </button>
        <button type="button" className="btn btn-ghost" onClick={onSetup}>
          Set up a deck
        </button>
        <button type="button" className="btn btn-ghost" onClick={onInsights}>
          Stack insights
        </button>
        <button type="button" className="btn btn-ghost" onClick={onStats}>
          View stats
        </button>
        <button type="button" className="btn btn-ghost" onClick={onSync}>
          Cloud sync
        </button>
      </div>

      {posChooser && (
        <div className="filter-overlay" onClick={() => setPosChooser(false)}>
          <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
            <span className="filter-title">Positions — which way?</span>
            <button type="button" className="filter-option" onClick={() => onStart("cardToPosition")}>
              Card → position
            </button>
            <button type="button" className="filter-option" onClick={() => onStart("positionToCard")}>
              Position → card
            </button>
            <button type="button" className="btn btn-ghost filter-close" onClick={() => setPosChooser(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
