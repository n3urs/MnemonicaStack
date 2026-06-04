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

export function allStackIds(): string[] {
  return STACKS.map((s) => s.id);
}

export function getStackDef(id: string): StackDef {
  return STACKS.find((s) => s.id === id) ?? STACKS[0];
}

export function getActiveStackId(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) || DEFAULT_STACK_ID;
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
