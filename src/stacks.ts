// The stack registry. The app can learn any of these; which one is active is
// stored in localStorage and read on load. Progress for each stack lives under
// its own storage key (see storage.ts), so switching never touches another
// stack's progress.

export interface StackDef {
  id: string;
  name: string;
  author: string;
  cards: string[]; // 52 cards, position 1 (top) → 52 (face), as rank+suit (T = ten)
}

export const STACKS: StackDef[] = [
  {
    id: "mnemonica",
    name: "Mnemonica",
    author: "Juan Tamariz",
    cards: [
      "4C", "2H", "7D", "3C", "4H", "6D", "AS", "5H", "9S", "2S",
      "QH", "3D", "QC", "8H", "6S", "5S", "9H", "KC", "2D", "JH",
      "3S", "8S", "6H", "TC", "5D", "KD", "2C", "3H", "8D", "5C",
      "KS", "JD", "8C", "TS", "KH", "JC", "7S", "TH", "AD", "4S",
      "7H", "4D", "AC", "9C", "JS", "QD", "7C", "QS", "TD", "6C",
      "AH", "9D",
    ],
  },
  {
    id: "aronson",
    name: "Aronson",
    author: "Simon Aronson",
    cards: [
      "JS", "KC", "5C", "2H", "9S", "AS", "3H", "6C", "8D", "AC",
      "TS", "5H", "2D", "KD", "7D", "8C", "3S", "AD", "7S", "5S",
      "QD", "AH", "8S", "3D", "7H", "QH", "5D", "7C", "4H", "KH",
      "4D", "TD", "JC", "JH", "TC", "JD", "4S", "TH", "6H", "3C",
      "2S", "9H", "KS", "6S", "4C", "8H", "9C", "QS", "6D", "QC",
      "2C", "9D",
    ],
  },
];

export const DEFAULT_STACK_ID = "mnemonica";

const ACTIVE_KEY = "mnemonica-trainer-active-stack";
const CUSTOM_KEY = "mnemonica-trainer-custom-stacks";

// ---- Custom stacks (user-created, stored locally) ----

function isValidDef(d: unknown): d is StackDef {
  const s = d as StackDef;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    Array.isArray(s.cards) &&
    s.cards.length === 52 &&
    s.cards.every((c) => typeof c === "string" && c.length === 2)
  );
}

export function getCustomStacks(): StackDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown[];
    return Array.isArray(list) ? list.filter(isValidDef) : [];
  } catch {
    return [];
  }
}

export function saveCustomStack(def: StackDef): void {
  const list = getCustomStacks().filter((s) => s.id !== def.id);
  list.push(def);
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function deleteCustomStack(id: string): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(getCustomStacks().filter((s) => s.id !== id)));
  } catch {
    /* ignore */
  }
}

export function isCustomStack(id: string): boolean {
  return getCustomStacks().some((s) => s.id === id);
}

// Parse a pasted card list into stack order. Accepts "4C", "10c", "TD", and
// suit symbols ("4♣"), separated by spaces / commas / newlines. Returns the
// parsed cards plus human-readable problems (bad tokens, dupes, missing).
export function parseStackCards(text: string): { cards: string[]; errors: string[] } {
  const SUIT_MAP: Record<string, string> = { S: "S", H: "H", D: "D", C: "C", "♠": "S", "♥": "H", "♦": "D", "♣": "C" };
  const tokens = text.trim().split(/[\s,;]+/).filter(Boolean);
  const cards: string[] = [];
  const errors: string[] = [];
  for (const tok of tokens) {
    const t = tok.toUpperCase().replace(/^10/, "T");
    const rank = t.slice(0, -1);
    const suit = SUIT_MAP[t.slice(-1)];
    if (!suit || !"A23456789TJQK".includes(rank) || rank.length !== 1) {
      errors.push(`can't read "${tok}"`);
      continue;
    }
    cards.push(rank + suit);
  }
  const seen = new Set<string>();
  for (const c of cards) {
    if (seen.has(c)) errors.push(`duplicate ${c}`);
    seen.add(c);
  }
  if (errors.length === 0 && cards.length !== 52) {
    errors.push(`${cards.length} of 52 cards`);
  }
  return { cards, errors };
}

// ---- Registry (built-in + custom) ----

export function allStacks(): StackDef[] {
  return [...STACKS, ...getCustomStacks()];
}

export function allStackIds(): string[] {
  return allStacks().map((s) => s.id);
}

export function getStackDef(id: string): StackDef {
  return allStacks().find((s) => s.id === id) ?? STACKS[0];
}

export function getActiveStackId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_KEY) || DEFAULT_STACK_ID;
    // Guard against a deleted custom stack lingering as "active".
    return allStacks().some((s) => s.id === id) ? id : DEFAULT_STACK_ID;
  } catch {
    return DEFAULT_STACK_ID;
  }
}

export function setActiveStackId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function activeStack(): StackDef {
  return getStackDef(getActiveStackId());
}

export function isMnemonica(): boolean {
  return getActiveStackId() === "mnemonica";
}
