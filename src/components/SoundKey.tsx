import { useState } from "react";
import { MAJOR_SOUNDS } from "../mnemonics";

export function SoundKey() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="soundkey-tab"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Open sound key"
      >
        <span className="soundkey-tab-label">Sound key</span>
      </button>
    );
  }

  return (
    <>
      <div
        className="soundkey-backdrop"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
        }}
      />
      <aside
        className="soundkey-panel"
        role="dialog"
        aria-label="Sound key"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="soundkey-head">
          <span className="soundkey-title">Sound key</span>
          <button
            type="button"
            className="soundkey-close"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="soundkey-note">Each digit is a consonant sound. Vowels and w, h, y are free.</p>
        <div className="soundkey-grid">
          {MAJOR_SOUNDS.map((m) => (
            <div key={m.digit} className="soundkey-row">
              <span className="soundkey-digit">{m.digit}</span>
              <span className="soundkey-sound">{m.sounds}</span>
            </div>
          ))}
        </div>

        <p className="soundkey-note">A card image is the suit's sound + the value's sound.</p>
        <div className="soundkey-suits">
          <span>
            <b className="is-red">♥</b> H
          </span>
          <span>
            <b>♠</b> S
          </span>
          <span>
            <b className="is-red">♦</b> D
          </span>
          <span>
            <b>♣</b> C
          </span>
        </div>

        <p className="soundkey-eg">position 1 = T → "tie"; 4♣ = C + R → "car".</p>
      </aside>
    </>
  );
}
