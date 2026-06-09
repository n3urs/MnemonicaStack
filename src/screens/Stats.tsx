import { useState } from "react";
import { cardLatency, type Stats as StatsData } from "../storage";
import { cardShort, positionOf, STACK } from "../stack";
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

// Gold (fast) → red (slow), interpolated in-palette.
function heatColor(t: number): string {
  const fast = [184, 153, 104]; // --gold
  const slow = [168, 32, 26]; // --suit-red
  const c = fast.map((v, i) => Math.round(v + (slow[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function latencyMap(stats: StatsData) {
  const cells = STACK.map((card, i) => ({
    card,
    pos: i + 1,
    avg: cardLatency(stats.cards[card]),
  }));
  const known = cells.filter((c) => c.avg !== null) as { card: string; pos: number; avg: number }[];
  if (known.length === 0) return { cells, min: 0, max: 0, known };
  const min = Math.min(...known.map((c) => c.avg));
  const max = Math.max(...known.map((c) => c.avg));
  return { cells, min, max, known };
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
  const heat = latencyMap(stats);
  const slowest = [...heat.known].sort((a, b) => b.avg - a.avg).slice(0, 5);

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

      <h2 className="section-title">Response speed</h2>
      {heat.known.length < 3 ? (
        <p className="empty-note">
          Answer drills to build your speed map — it colours each position by how fast you recall
          it.
        </p>
      ) : (
        <>
          <div className="heat-grid">
            {heat.cells.map(({ card, pos, avg }) => {
              const t = avg === null ? null : heat.max === heat.min ? 0 : (avg - heat.min) / (heat.max - heat.min);
              return (
                <div
                  key={card}
                  className={`heat-cell ${t === null ? "is-empty" : ""}`}
                  style={t === null ? undefined : { background: heatColor(t) }}
                  title={avg === null ? `${pos}: no data` : `${pos} · ${cardShort(card)} · ${(avg / 1000).toFixed(1)}s`}
                >
                  {pos}
                </div>
              );
            })}
          </div>
          <div className="heat-legend">
            <span className="heat-swatch" style={{ background: heatColor(0) }} />
            <span>fast</span>
            <span className="heat-swatch" style={{ background: heatColor(1) }} />
            <span>slow</span>
            <span className="heat-swatch is-empty" />
            <span>no data</span>
          </div>
          {slowest.length > 0 && (
            <div className="slow-list">
              <span className="learn-field-label">Slowest to recall</span>
              {slowest.map((s) => (
                <div key={s.card} className="slow-row">
                  <span className="slow-card">{cardShort(s.card)}</span>
                  <span className="slow-pos">pos {s.pos}</span>
                  <span className="slow-time">{(s.avg / 1000).toFixed(1)}s</span>
                </div>
              ))}
            </div>
          )}
        </>
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
