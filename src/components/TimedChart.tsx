import type { TimedRun } from "../storage";

// A compact line chart of timed-run averages (seconds per card). Seconds sit
// on the Y axis with slowest at the top and fastest at the bottom, so an
// improving streak reads as the line trending downward. The best run is marked
// in bright gold.
export function TimedChart({ runs }: { runs: TimedRun[] }) {
  if (runs.length < 2) {
    return (
      <p className="timed-chart-empty">
        {runs.length === 0
          ? "No runs yet — your speed trend will show here."
          : "One run logged. Do another to start the trend."}
      </p>
    );
  }

  const avgs = runs.map((r) => r.avg);
  const max = Math.max(...avgs);
  const min = Math.min(...avgs);
  const range = max - min || 1;

  const W = 300;
  const H = 132;
  const padX = 12;
  const padTop = 12;
  const padBottom = 16;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const n = runs.length;

  const x = (i: number) => padX + (i / (n - 1)) * plotW;
  const y = (avg: number) => padTop + ((max - avg) / range) * plotH;

  const pts = runs.map((r, i) => [x(i), y(r.avg)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)} ${padTop + plotH} L${x(0).toFixed(1)} ${padTop + plotH} Z`;
  const bestIdx = avgs.indexOf(min);

  return (
    <div className="timed-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="timed-chart-svg" role="img" aria-label="Timed run speeds">
        {/* Hex values mirror --gold / --gold-bright / --bg — SVG attributes
            can't resolve CSS custom properties. */}
        <defs>
          <linearGradient id="timedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b89968" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#b89968" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#timedFill)" />
        <path d={line} fill="none" stroke="#b89968" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === bestIdx ? 4 : 2.5}
            fill={i === bestIdx ? "#d4b878" : "#0a0807"}
            stroke="#b89968"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="timed-chart-labels">
        <span>fastest {min.toFixed(1)}s</span>
        <span>{n} runs</span>
        <span>latest {avgs[n - 1].toFixed(1)}s</span>
      </div>
    </div>
  );
}
