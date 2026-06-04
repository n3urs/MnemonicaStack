import { activeStack } from "./stacks";

// The stack currently being learned, positions 1-52, top of deck to bottom.
// Cards are encoded as two-character strings: rank + suit (T = ten). The order
// comes from whichever stack is active (see stacks.ts); switching stacks
// reloads the app so this re-initialises.
export const STACK: string[] = activeStack().cards;

const RANK_VALUE: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, T: 10, J: 11, Q: 12, K: 13,
};

export const SUIT_SYMBOLS: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const SUIT_NAMES: Record<string, string> = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" };
export const RANK_NAMES: Record<string, string> = {
  A: "ace", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six",
  "7": "seven", "8": "eight", "9": "nine", T: "ten", J: "jack", Q: "queen", K: "king",
};

export function rankOf(card: string): string {
  return card[0];
}

export function suitOf(card: string): string {
  return card[1];
}

export function isRed(card: string): boolean {
  return suitOf(card) === "H" || suitOf(card) === "D";
}

export function displayRank(card: string): string {
  const r = rankOf(card);
  return r === "T" ? "10" : r;
}

export function cardName(card: string): string {
  return `${RANK_NAMES[rankOf(card)]} of ${SUIT_NAMES[suitOf(card)]}`;
}

// Compact label, e.g. "K♣" or "10♦".
export function cardShort(card: string): string {
  return `${displayRank(card)}${SUIT_SYMBOLS[suitOf(card)]}`;
}

export function positionOf(card: string): number {
  return STACK.indexOf(card) + 1;
}

export function cardAt(position: number): string {
  return STACK[position - 1];
}

// The memorised stack is treated cyclically: the card after position 52 is
// position 1, and the card before position 1 is position 52.
export function nextCard(card: string): string {
  return STACK[positionOf(card) % 52];
}

export function prevCard(card: string): string {
  return STACK[(positionOf(card) - 2 + 52) % 52];
}

// A card's rank as a number: A=1 … K=13.
export function rankValue(card: string): number {
  return RANK_VALUE[rankOf(card)];
}

// Cards that sit on their own number — rank value equals position. Can only
// happen in the first 13 positions (no rank exceeds 13). Computed from the
// active stack, so it's correct for whichever stack is loaded.
export function selfLocators(): { card: string; pos: number }[] {
  const out: { card: string; pos: number }[] = [];
  for (let p = 1; p <= 13; p++) {
    const c = STACK[p - 1];
    if (rankValue(c) === p) out.push({ card: c, pos: p });
  }
  return out;
}
