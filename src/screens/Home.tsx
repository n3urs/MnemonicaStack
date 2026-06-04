import { useState } from "react";
import { learnedCount, type Stats, type TimedMode } from "../storage";
import { type Mode } from "../quiz";
import { MetricBox } from "../components/MetricBox";
import { Ornament } from "../components/Ornament";

export function Home({
  stats,
  onLearn,
  onStart,
  onAcaan,
  onStats,
  onReference,
  onSetup,
  onInsights,
  onSettings,
  onToolkit,
  onTimed,
}: {
  stats: Stats;
  onLearn: () => void;
  onStart: (mode: Mode) => void;
  onAcaan: () => void;
  onStats: () => void;
  onReference: () => void;
  onSetup: () => void;
  onInsights: () => void;
  onSettings: () => void;
  onToolkit: () => void;
  onTimed: (mode: TimedMode) => void;
}) {
  const [posChooser, setPosChooser] = useState(false);
  const [timedChooser, setTimedChooser] = useState(false);
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
        <button type="button" className="mode-button" onClick={() => setTimedChooser(true)}>
          <span className="mode-name">Timed run</span>
          <span className="mode-desc">Race the clock — cut to cards, or name their positions.</span>
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
        <button type="button" className="btn btn-ghost" onClick={onSettings}>
          Settings
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

      {timedChooser && (
        <div className="filter-overlay" onClick={() => setTimedChooser(false)}>
          <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
            <span className="filter-title">Timed run — which?</span>
            <button type="button" className="filter-option" onClick={() => onTimed("cut")}>
              Cut to it · 5 cards
            </button>
            <button type="button" className="filter-option" onClick={() => onTimed("position")}>
              Name the position · 10 cards
            </button>
            <button type="button" className="btn btn-ghost filter-close" onClick={() => setTimedChooser(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
