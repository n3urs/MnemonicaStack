import { STACK } from "./stack";
import { allStackIds, DEFAULT_STACK_ID, getActiveStackId } from "./stacks";

const STORAGE_PREFIX = "mnemonica-trainer-v1";

// The original (Mnemonica) progress lives at the bare key — never moved, so
// existing data is safe. Every other stack gets its own suffixed key.
function storageKey(stackId: string): string {
  return stackId === DEFAULT_STACK_ID ? STORAGE_PREFIX : `${STORAGE_PREFIX}:${stackId}`;
}

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

// One finished timed run: average seconds per card, and when it happened.
export interface TimedRun {
  avg: number;
  at: number; // ms epoch
}

// The two timed modes — cutting to a card vs. naming its position.
export type TimedMode = "cut" | "position";

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
  timedHistory: TimedRun[]; // "cut" timed runs, oldest → newest (capped)
  timedBest: number | null; // best (lowest) average seconds per card — "cut" mode
  timedRuns: number; // how many "cut" timed runs completed — derived from history
  timedPosHistory: TimedRun[]; // "position" (recall-speed) timed runs
  timedPosBest: number | null; // best average seconds per card — "position" mode
  timedPosRuns: number; // how many "position" timed runs completed
  updatedAt: number; // ms epoch of last local change, for sync conflict resolution
}

// Keep the history bounded so storage / sync payloads stay small.
const TIMED_HISTORY_CAP = 100;

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
    timedHistory: [],
    timedBest: null,
    timedRuns: 0,
    timedPosHistory: [],
    timedPosBest: null,
    timedPosRuns: 0,
    updatedAt: 0,
  };
}

function bestOf(history: TimedRun[]): number | null {
  return history.length ? Math.min(...history.map((r) => r.avg)) : null;
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
    ...timedFields(r),
    ...posTimedFields(r),
    updatedAt: r.updatedAt ?? 0,
  };
}

// Normalise the "position" timed fields (no legacy migration — this mode is new).
function posTimedFields(
  r: Partial<Stats>,
): Pick<Stats, "timedPosHistory" | "timedPosBest" | "timedPosRuns"> {
  const timedPosHistory = (r.timedPosHistory ?? []).slice(-TIMED_HISTORY_CAP);
  return {
    timedPosHistory,
    timedPosBest: bestOf(timedPosHistory),
    timedPosRuns: timedPosHistory.length,
  };
}

// Normalise the timed fields, deriving best/count from the history. Migrates
// pre-history saves (which only had a `timedBest`) by seeding one run so the
// graph and best survive the upgrade.
function timedFields(r: Partial<Stats>): Pick<Stats, "timedHistory" | "timedBest" | "timedRuns"> {
  const seeded =
    r.timedHistory ?? (r.timedBest != null ? [{ avg: r.timedBest, at: Date.now() }] : []);
  const timedHistory = seeded.slice(-TIMED_HISTORY_CAP);
  return { timedHistory, timedBest: bestOf(timedHistory), timedRuns: timedHistory.length };
}

export function loadStats(): Stats {
  return loadStatsFor(getActiveStackId());
}

export function loadStatsFor(stackId: string): Stats {
  try {
    const raw = localStorage.getItem(storageKey(stackId));
    if (!raw) return defaultStats();
    return normalizeStats(JSON.parse(raw) as Partial<Stats>);
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: Stats): void {
  saveStatsFor(getActiveStackId(), stats);
}

export function saveStatsFor(stackId: string, stats: Stats): void {
  try {
    localStorage.setItem(storageKey(stackId), JSON.stringify(stats));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

// ---- Multi-stack helpers (used by cloud sync) ----

// Every stack that has saved progress, keyed by stack id.
export function loadAllProgress(): Record<string, Stats> {
  const out: Record<string, Stats> = {};
  for (const id of allStackIds()) {
    try {
      const raw = localStorage.getItem(storageKey(id));
      if (raw) out[id] = normalizeStats(JSON.parse(raw) as Partial<Stats>);
    } catch {
      /* skip a corrupt entry */
    }
  }
  return out;
}

export function saveAllProgress(map: Record<string, Stats>): void {
  for (const [id, stats] of Object.entries(map)) saveStatsFor(id, stats);
}

// Per-stack newer-wins merge — never loses a stack that only one side has.
export function mergeProgress(
  local: Record<string, Stats>,
  cloud: Record<string, Stats>,
): Record<string, Stats> {
  const out: Record<string, Stats> = { ...local };
  for (const [id, cloudStats] of Object.entries(cloud)) {
    const localStats = out[id];
    if (!localStats || cloudStats.updatedAt >= localStats.updatedAt) out[id] = cloudStats;
  }
  return out;
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

// Record a finished timed run. `avgSeconds` is total time / cards.
export function applyTimedRun(stats: Stats, avgSeconds: number, mode: TimedMode = "cut"): Stats {
  if (mode === "position") {
    const h = [...stats.timedPosHistory, { avg: avgSeconds, at: Date.now() }].slice(-TIMED_HISTORY_CAP);
    return { ...stats, timedPosHistory: h, timedPosBest: bestOf(h), timedPosRuns: h.length, updatedAt: Date.now() };
  }
  const h = [...stats.timedHistory, { avg: avgSeconds, at: Date.now() }].slice(-TIMED_HISTORY_CAP);
  return { ...stats, timedHistory: h, timedBest: bestOf(h), timedRuns: h.length, updatedAt: Date.now() };
}

// Discard the most recent timed run (e.g. you got distracted mid-run). Best
// and count are recomputed from what's left.
export function retireLastTimedRun(stats: Stats, mode: TimedMode = "cut"): Stats {
  if (mode === "position") {
    if (stats.timedPosHistory.length === 0) return stats;
    const h = stats.timedPosHistory.slice(0, -1);
    return { ...stats, timedPosHistory: h, timedPosBest: bestOf(h), timedPosRuns: h.length, updatedAt: Date.now() };
  }
  if (stats.timedHistory.length === 0) return stats;
  const h = stats.timedHistory.slice(0, -1);
  return { ...stats, timedHistory: h, timedBest: bestOf(h), timedRuns: h.length, updatedAt: Date.now() };
}

export function isLearned(stats: Stats, card: string): boolean {
  return !!stats.learn[card]?.introduced;
}

export function learnedCount(stats: Stats): number {
  return Object.values(stats.learn).filter((l) => l.introduced).length;
}

// A learned card counts as "weak" if it's in a low Leitner box, has missed
// recently, or has a poor hit rate once it's been seen a few times.
export function isWeakCard(stats: Stats, card: string): boolean {
  const ln = stats.learn[card];
  if (!ln?.introduced) return false;
  const s = stats.cards[card];
  const recentWrong = s ? s.recent.filter((r) => r === false).length : 0;
  if (ln.box <= 2) return true;
  if (recentWrong > 0) return true;
  if (s && s.seen >= 3 && s.correct / s.seen < 0.7) return true;
  return false;
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

// Pick the next card to drill, restricted to cards the user has learned (and,
// optionally, to those passing `inPool` — used by the drill filters). Returns
// null when nothing matches. Due cards and cards in lower Leitner boxes are
// favoured, on top of the recent-wrong weighting.
export function selectLearnedCard(
  stats: Stats,
  exclude?: string,
  inPool?: (card: string) => boolean,
): string | null {
  const pool = STACK.filter((c) => stats.learn[c]?.introduced && (!inPool || inPool(c)));
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
