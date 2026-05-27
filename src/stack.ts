// The Mnemonica stack, positions 1-52, top of deck to bottom.
// Cards are encoded as two-character strings: rank + suit (T = ten).
export const STACK: string[] = [
  "4C", "2H", "7D", "3C", "4H", "6D", "AS", "5H", "9S", "2S",
  "QH", "3D", "QC", "8H", "6S", "5S", "9H", "KC", "2D", "JH",
  "3S", "8S", "6H", "TC", "5D", "KD", "2C", "3H", "8D", "5C",
  "KS", "JD", "8C", "TS", "KH", "JC", "7S", "TH", "AD", "4S",
  "7H", "4D", "AC", "9C", "JS", "QD", "7C", "QS", "TD", "6C",
  "AH", "9D",
];

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
