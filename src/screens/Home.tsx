import { learnedCount, type Stats } from "../storage";
import { MODES, type Mode } from "../quiz";
import { MetricBox } from "../components/MetricBox";
import { Ornament } from "../components/Ornament";

export function Home({
  stats,
  onLearn,
  onStart,
  onSession,
  onStats,
  onReference,
  onSetup,
  onInsights,
  onSync,
  onToolkit,
  onControl,
}: {
  stats: Stats;
  onLearn: () => void;
  onStart: (mode: Mode) => void;
  onSession: () => void;
  onStats: () => void;
  onReference: () => void;
  onSetup: () => void;
  onInsights: () => void;
  onSync: () => void;
  onToolkit: () => void;
  onControl: () => void;
}) {
  const accuracy =
    stats.totalAnswered === 0 ? "—" : `${Math.round((stats.totalCorrect / stats.totalAnswered) * 100)}%`;
  const learned = learnedCount(stats);

  return (
    <div className="screen home">
      <header className="home-header">
        <h1 className="title">Mnemonica Trainer</h1>
        <p className="subtitle">
          <em>A daily drill for the memorised deck.</em>
        </p>
      </header>

      <div className="metric-grid metric-grid--4">
        <MetricBox label="Accuracy" value={accuracy} />
        <MetricBox label="Answered" value={stats.totalAnswered} />
        <MetricBox label="Best run" value={stats.bestStreak} />
        <MetricBox label="Day streak" value={stats.dailyStreak} />
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
        {MODES.map((m) => (
          <button key={m.id} type="button" className="mode-button" onClick={() => onStart(m.id)}>
            <span className="mode-name">{m.name}</span>
            <span className="mode-desc">{m.description}</span>
          </button>
        ))}
        <button type="button" className="mode-button" onClick={onControl}>
          <span className="mode-name">Control a card</span>
          <span className="mode-desc">Cut to it, bring it to the top, or drill the TPC.</span>
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
    </div>
  );
}
