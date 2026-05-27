import { useState } from "react";
import type { Stats as StatsData } from "../storage";
import { positionOf } from "../stack";
import { MetricBox } from "../components/MetricBox";
import { PlayingCard } from "../components/PlayingCard";
import { Ornament } from "../components/Ornament";

function worstCards(stats: StatsData, limit = 10) {
  return Object.entries(stats.cards)
    .filter(([, s]) => s.seen >= 2)
    .map(([card, s]) => ({ card, accuracy: s.correct / s.seen }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

export function Stats({
  stats,
  onBack,
  onReset,
}: {
  stats: StatsData;
  onBack: () => void;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const accuracy =
    stats.totalAnswered === 0 ? "—" : `${Math.round((stats.totalCorrect / stats.totalAnswered) * 100)}%`;
  const cardsSeen = Object.values(stats.cards).filter((s) => s.seen > 0).length;
  const weak = worstCards(stats);

  return (
    <div className="screen stats-screen">
      <div className="toolbar">
        <button type="button" className="btn-link" onClick={onBack}>
          ← Back
        </button>
        <span className="toolbar-title">Your progress</span>
        <span className="toolbar-spacer" />
      </div>

      <div className="metric-grid metric-grid--3">
        <MetricBox label="Answered" value={stats.totalAnswered} />
        <MetricBox label="Accuracy" value={accuracy} />
        <MetricBox label="Best run" value={stats.bestStreak} />
        <MetricBox label="Current streak" value={stats.currentStreak} />
        <MetricBox label="Day streak" value={stats.dailyStreak} />
        <MetricBox label="Cards seen" value={`${cardsSeen}/52`} />
      </div>

      <Ornament />

      <h2 className="section-title">Cards that need more practice</h2>
      {weak.length === 0 ? (
        <p className="empty-note">Answer a few more cards to surface your weak spots.</p>
      ) : (
        <div className="weak-grid">
          {weak.map(({ card, accuracy: acc }) => (
            <div key={card} className="weak-card">
              <PlayingCard card={card} size="small" />
              <span className="weak-pos">pos {positionOf(card)}</span>
              <span className="weak-acc">{Math.round(acc * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <Ornament />

      <div className="reset-area">
        {confirming ? (
          <div className="confirm">
            <p className="confirm-text">Reset all progress? This cannot be undone.</p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onReset();
                  setConfirming(false);
                }}
              >
                Reset everything
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost reset-btn" onClick={() => setConfirming(true)}>
            Reset all progress
          </button>
        )}
      </div>
    </div>
  );
}
