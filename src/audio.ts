// A short synthesized chime for correct answers and a softer descending one
// for wrong answers — no audio file shipped. Two sine notes each, quick attack
// and exponential decay.
//
// iOS WKWebView auto-suspends the AudioContext when the app is backgrounded.
// If we just call resume() and immediately schedule notes, the schedule lands
// against the still-frozen currentTime and the envelope plays out "in the past"
// while the context catches up — you hear nothing. We wait for resume to
// settle before scheduling, which fixes the disappearing-sound bug.

let ctx: AudioContext | null = null;

function resetCtx(): void {
  if (ctx) {
    try {
      ctx.close();
    } catch {
      /* ignore */
    }
    ctx = null;
  }
}

// On iOS, returning from screen sleep or app background often leaves the
// AudioContext in a stale state where resume() "succeeds" but no sound
// actually plays. Force a fresh context every time the page becomes visible
// again — the next play() call will create one on the user's gesture.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resetCtx();
  });
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  if (!ctx || ctx.state === "closed") {
    try {
      ctx = new window.AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

function play(schedule: (c: AudioContext) => void): void {
  const c = getCtx();
  if (!c) return;
  const run = () => {
    try {
      schedule(c);
    } catch {
      /* Audio is a flourish; never let it break the drill. */
    }
  };
  if (c.state === "suspended") {
    c.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

function note(
  c: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peakGain: number,
): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export function ding(): void {
  play((c) => {
    const t = c.currentTime;
    note(c, 1318.5, t, 0.55, 0.08); // E6
    note(c, 1975.5, t + 0.045, 0.5, 0.05); // B6 — a fifth above, slightly softer
  });
}

// Soft descending minor third for a wrong answer — communicates "not quite"
// without being harsh. Lower register and shorter than the ding.
export function dud(): void {
  play((c) => {
    const t = c.currentTime;
    note(c, 440, t, 0.4, 0.14); // A4
    note(c, 349.2, t + 0.09, 0.45, 0.12); // F4 — a minor third down
  });
}

// A flatter, buzzier tone (square wave, mostly-held envelope) for the
// Formula-One-style countdown beeps.
function tone(
  c: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peakGain: number,
): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.008);
  gain.gain.setValueAtTime(peakGain, Math.max(startAt + 0.01, startAt + duration - 0.04));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

// One of the three identical "red light" beeps, on 3 · 2 · 1.
export function countBeep(): void {
  play((c) => tone(c, 620, c.currentTime, 0.16, 0.06));
}

// The higher, longer "lights out" tone when the run starts.
export function goBeep(): void {
  play((c) => tone(c, 1046.5, c.currentTime, 0.5, 0.08));
}

// Warm up the audio context inside a user gesture (the Start tap), so the
// first countdown beep — fired from an effect a beat later — isn't blocked.
export function primeAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}
