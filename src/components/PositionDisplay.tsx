export function PositionDisplay({ position, size = "large" }: { position: number; size?: "medium" | "large" }) {
  return (
    <div className={`position-display position-display--${size}`}>
      <span className="pd-label">position</span>
      <span className="pd-number">{position}</span>
    </div>
  );
}
