export function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-box">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}
