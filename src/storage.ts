import { STACK } from "./stack";

const STORAGE_KEY = "mnemonica-trainer-v1";

export interface CardStat {
  seen: number;
  correct: number;
  wrong: number;
  recent: boolean[]; // last 10 results, true = correct
}

export interface LearnCard {
  introduced: boolean;
  box: number; // Leitner box, 1 (frequent) .. 5 (rare)
  due: string; // YYYY-MM-DD when this card is next due
}

export interface CardNote {
  image?: string; // user override for the card image
  link?: string; // user's personal linking image
}

// Self-rated accuracy for the "Control a Card" trainer. Deliberately kept
// apart from recall stats — controlling a card is a physical skill, not a
// memory one, so it gets its own tally.
export interface ControlStat {
  attempts: number;
  nailed: number; // "Nailed it"
  close: number; // "1–2 off"
  off: number; // "Way off"
}

export type ControlMode = "cutToPosition" | "controlToTop" | "tpc";
export type ControlRating = "nailed" | "close" | "off";

export function emptyControlStat(): ControlStat {
  return { attempts: 0, nailed: 0, close: 0, off: 0 };
}

export interface Stats {
  totalAnswered: number;
  totalCorrect: number;
  currentStreak: number;
  bestStreak: number;
  dailyStreak: number;
  lastSessionDate: string | null; // YYYY-MM-DD of the most recent drill
  cards: Record<string, CardStat>;
  learn: Record<string, LearnCard>;
  notes: Record<string, CardNote>;
  pegs: Record<string, string>; // position (as string) -> user's peg override
  cutNotes: Record<string, string>; // position -> user's "cut to it" method override
  control: Record<ControlMode, ControlStat>; // self-rated control-trainer accuracy
  updatedAt: number; // ms epoch of last local change, for sync conflict resolution
}

// Days until a card is due again, indexed by Leitner box (1..5).
const SRS_INTERVALS = [0, 0, 1, 2, 4, 7];

export function defaultStats(): Stats {
  return {
    totalAnswered: 0,
    totalCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
    dailyStreak: 0,
    lastSessionDate: null,
    cards: {},
    learn: {},
    notes: {},
    pegs: {},
    cutNotes: {},
    control: {
      cutToPosition: emptyControlStat(),
      controlToTop: emptyControlStat(),
      tpc: emptyControlStat(),
    },
    updatedAt: 0,
  };
}

// Merge an arbitrary (possibly partial) object onto a fresh default, so data
// loaded from storage or the cloud always has every field.
export function normalizeStats(raw: Partial<Stats> | null | undefined): Stats {
  const r = raw ?? {};
  return {
    ...defaultStats(),
    ...r,
    cards: r.cards ?? {},
    learn: r.learn ?? {},
    notes: r.notes ?? {},
    pegs: r.pegs ?? {},
    cutNotes: r.cutNotes ?? {},
    control: {
      cutToPosition: r.control?.cutToPosition ?? emptyControlStat(),
      controlToTop: r.control?.controlToTop ?? emptyControlStat(),
      tpc: r.control?.tpc ?? emptyControlStat(),
    },
    updatedAt: r.updatedAt ?? 0,
  };
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    return normalizeStats(JSON.parse(raw) as Partial<Stats>);
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateStr(d);
}

function yesterdayStr(): string {
  return addDaysStr(-1);
}

function applyDailyStreak(stats: Stats): Stats {
  const today = dateStr(new Date());
  if (stats.lastSessionDate === today) return stats;
  const dailyStreak = stats.lastSessionDate === yesterdayStr() ? stats.dailyStreak + 1 : 1;
  return { ...stats, dailyStreak, lastSessionDate: today };
}

export function applyAnswer(stats: Stats, card: string, correct: boolean): Stats {
  const prev = stats.cards[card] ?? { seen: 0, correct: 0, wrong: 0, recent: [] };
  const cardStat: CardStat = {
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    recent: [...prev.recent, correct].slice(-10),
  };
  const currentStreak = correct ? stats.currentStreak + 1 : 0;

  let learn = stats.learn;
  const ln = stats.learn[card];
  if (ln?.introduced) {
    const box = correct ? Math.min(5, ln.box + 1) : 1;
    learn = { ...stats.learn, [card]: { introduced: true, box, due: addDaysStr(SRS_INTERVALS[box]) } };
  }

  const next: Stats = {
    ...stats,
    totalAnswered: stats.totalAnswered + 1,
    totalCorrect: stats.totalCorrect + (correct ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    cards: { ...stats.cards, [card]: cardStat },
    learn,
    updatedAt: Date.now(),
  };
  return applyDailyStreak(next);
}

export function introduceCard(stats: Stats, card: string): Stats {
  if (stats.learn[card]?.introduced) return stats;
  return {
    ...stats,
    learn: { ...stats.learn, [card]: { introduced: true, box: 1, due: dateStr(new Date()) } },
    updatedAt: Date.now(),
  };
}

export function applyNote(stats: Stats, card: string, patch: CardNote): Stats {
  const prev = stats.notes[card] ?? {};
  return {
    ...stats,
    notes: { ...stats.notes, [card]: { ...prev, ...patch } },
    updatedAt: Date.now(),
  };
}

export function applyPeg(stats: Stats, position: number, value: string): Stats {
  return { ...stats, pegs: { ...stats.pegs, [position]: value }, updatedAt: Date.now() };
}

export function applyCutNote(stats: Stats, position: number, value: string): Stats {
  return { ...stats, cutNotes: { ...stats.cutNotes, [position]: value }, updatedAt: Date.now() };
}

// Record a self-rating from the Control-a-Card trainer. Lives in its own
// `control` bucket so it never touches recall accuracy.
export function applyControlRating(stats: Stats, mode: ControlMode, rating: ControlRating): Stats {
  const prev = stats.control[mode] ?? emptyControlStat();
  const next: ControlStat = {
    attempts: prev.attempts + 1,
    nailed: prev.nailed + (rating === "nailed" ? 1 : 0),
    close: prev.close + (rating === "close" ? 1 : 0),
    off: prev.off + (rating === "off" ? 1 : 0),
  };
  return {
    ...stats,
    control: { ...stats.control, [mode]: next },
    updatedAt: Date.now(),
  };
}

// "Nailed it" share, 0–100, or null when there are no attempts yet.
export function controlAccuracy(stat: ControlStat): number | null {
  if (stat.attempts === 0) return null;
  return Math.round((stat.nailed / stat.attempts) * 100);
}

export function isLearned(stats: Stats, card: string): boolean {
  return !!stats.learn[card]?.introduced;
}

export function learnedCount(stats: Stats): number {
  return Object.values(stats.learn).filter((l) => l.introduced).length;
}

// Higher weight => the card surfaces more often.
// weight = 1 + (recent wrong x 2) + (2 if seen fewer than 5 times); unseen = 5.
export function cardWeight(stats: Stats, card: string): number {
  const s = stats.cards[card];
  if (!s || s.seen === 0) return 5;
  const recentWrong = s.recent.filter((r) => r === false).length;
  let weight = 1 + recentWrong * 2;
  if (s.seen < 5) weight += 2;
  return weight;
}

function weightedPick(cards: string[], weightOf: (card: string) => number): string {
  const weights = cards.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < cards.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return cards[i];
  }
  return cards[cards.length - 1];
}

// Pick the next card to drill, restricted to cards the user has learned.
// Returns null when nothing has been learned yet. Due cards and cards in lower
// Leitner boxes are favoured, on top of the recent-wrong weighting.
export function selectLearnedCard(stats: Stats, exclude?: string): string | null {
  const pool = STACK.filter((c) => stats.learn[c]?.introduced);
  if (pool.length === 0) return null;
  let candidates = exclude ? pool.filter((c) => c !== exclude) : pool;
  if (candidates.length === 0) candidates = pool;
  const today = dateStr(new Date());
  return weightedPick(candidates, (c) => {
    const ln = stats.learn[c]!;
    const dueBoost = ln.due <= today ? 4 : 0;
    const boxBoost = 6 - ln.box;
    return cardWeight(stats, c) + dueBoost + boxBoost;
  });
}

// Pick up to `n` DISTINCT learned cards for a focused session, using the same
// Leitner/recent-wrong weighting as the open-ended drill. If fewer than `n`
// cards are learned, returns all of them. Order is the weighted draw order.
export function selectSessionCards(stats: Stats, n: number): string[] {
  const pool = STACK.filter((c) => stats.learn[c]?.introduced);
  const today = dateStr(new Date());
  const weightOf = (c: string) => {
    const ln = stats.learn[c]!;
    const dueBoost = ln.due <= today ? 4 : 0;
    const boxBoost = 6 - ln.box;
    return cardWeight(stats, c) + dueBoost + boxBoost;
  };
  const remaining = [...pool];
  const chosen: string[] = [];
  while (chosen.length < n && remaining.length > 0) {
    const pick = weightedPick(remaining, weightOf);
    chosen.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return chosen;
}
