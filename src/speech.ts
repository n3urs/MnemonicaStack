// Text-to-speech for the "spoken card" drill mode. Uses the built-in Web
// SpeechSynthesis API — no audio files shipped.
//
// The browser default voice is unreliable (on macOS Chrome it's sometimes a
// novelty voice like "Albert" that sounds genuinely demonic). We pick a
// known-good English voice up front and fall back gracefully if it isn't
// installed.

let chosenVoice: SpeechSynthesisVoice | null = null;

// Apple system voices (Mac + iOS) that read clearly. We try them in order; the
// first one installed wins.
const PREFERRED_VOICES = [
  "Samantha", // US English, the default on most iPhones/Macs
  "Ava",
  "Allison",
  "Susan",
  "Karen", // AU
  "Daniel", // GB
  "Serena", // GB
  "Moira", // IE
  "Tessa",
  "Fiona",
  "Alex", // older Mac default, still clear
  "Tom",
  // Windows fallbacks
  "Microsoft Zira",
  "Microsoft David",
  "Microsoft Aria",
];

function chooseVoice(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return; // voices still loading; retry on voiceschanged

  for (const name of PREFERRED_VOICES) {
    const v = voices.find((vc) => vc.name.includes(name) && vc.lang.startsWith("en"));
    if (v) {
      chosenVoice = v;
      return;
    }
  }
  // Fall back: any local English voice (local = installed on device, usually
  // higher quality than a remote/network voice).
  const localEn = voices.find((v) => v.lang.startsWith("en") && v.localService);
  if (localEn) {
    chosenVoice = localEn;
    return;
  }
  // Last resort: any English voice.
  const anyEn = voices.find((v) => v.lang.startsWith("en"));
  if (anyEn) chosenVoice = anyEn;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  chooseVoice(); // attempt immediately — works on Safari / iOS
  // Chrome on Mac loads voices async; re-pick when the list arrives.
  window.speechSynthesis.addEventListener?.("voiceschanged", chooseVoice);
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    if (!chosenVoice) chooseVoice();
    const utt = new SpeechSynthesisUtterance(text);
    if (chosenVoice) utt.voice = chosenVoice;
    utt.lang = chosenVoice?.lang ?? "en-US";
    utt.rate = 1;
    utt.pitch = 1;
    // Speech at full volume sits much louder than the synthesized sine dings;
    // 0.5 brings it into the same perceptual ballpark.
    utt.volume = 0.5;
    window.speechSynthesis.speak(utt);
  } catch {
    /* speech is a flourish; never let it break the drill */
  }
}

export function cancelSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

// Speak and resolve when the utterance finishes — the hands-free drill chains
// phrases off this. A timeout fallback covers platforms where end/error events
// don't fire reliably (iOS after interruptions).
export function speakAsync(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    try {
      window.speechSynthesis.cancel();
      if (!chosenVoice) chooseVoice();
      const utt = new SpeechSynthesisUtterance(text);
      if (chosenVoice) utt.voice = chosenVoice;
      utt.lang = chosenVoice?.lang ?? "en-US";
      utt.rate = 1;
      utt.pitch = 1;
      utt.volume = 0.5;
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      utt.onend = finish;
      utt.onerror = finish;
      setTimeout(finish, Math.max(2500, text.length * 130));
      window.speechSynthesis.speak(utt);
    } catch {
      resolve();
    }
  });
}
