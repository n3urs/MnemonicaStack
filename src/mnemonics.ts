// Memory hooks for learning the stack from zero.
//
// Position pegs use the Major System: each digit maps to a consonant sound and
// vowels are free, so a number becomes a concrete, picturable word.
// Card images use the suit's initial sound + the value's Major sound, so pip
// cards can be reconstructed from the card itself. Face cards aren't derivable,
// so they get a vivid figure themed by suit: hearts = love (Cupid, Queen of
// Hearts, suicide king), spades = death/black (black knight, black widow,
// executioner), diamonds = wealth/the card's own art (jewel thief, diamond
// queen, one-eyed king), clubs = clover/green (leprechaun, garden queen, oak
// king). All of these are starting points — the app lets you override any of
// them, and the position pegs, too.

export const MAJOR_SOUNDS: { digit: string; sounds: string }[] = [
  { digit: "0", sounds: "s, z" },
  { digit: "1", sounds: "t, d" },
  { digit: "2", sounds: "n" },
  { digit: "3", sounds: "m" },
  { digit: "4", sounds: "r" },
  { digit: "5", sounds: "l" },
  { digit: "6", sounds: "sh, ch, j" },
  { digit: "7", sounds: "k, g" },
  { digit: "8", sounds: "f, v" },
  { digit: "9", sounds: "p, b" },
];

// Index 0 = position 1.
export const POSITION_PEGS: string[] = [
  "tie", "Noah", "ma", "rye", "law", "shoe", "cow", "ivy", "bee", "toes",
  "toad", "tin", "tomb", "tire", "towel", "dish", "dog", "dove", "tub", "nose",
  "net", "nun", "name", "Nero", "nail", "notch", "neck", "knife", "knob", "mouse",
  "mat", "moon", "mummy", "mower", "mule", "match", "mug", "movie", "mop", "rose",
  "rod", "rain", "ram", "rower", "roll", "roach", "rock", "roof", "rope", "lace",
  "lid", "lion",
];

export const CARD_IMAGES: Record<string, string> = {
  // Hearts (H + value sound)
  AH: "hat", "2H": "hen", "3H": "ham", "4H": "hare", "5H": "heel",
  "6H": "hedge", "7H": "hawk", "8H": "hive", "9H": "hippo", TH: "house",
  JH: "Cupid", QH: "Queen of Hearts", KH: "suicide king",
  // Spades (S + value sound)
  AS: "suit", "2S": "sun", "3S": "sumo", "4S": "sewer", "5S": "seal",
  "6S": "sash", "7S": "sock", "8S": "sofa", "9S": "soap", TS: "sauce",
  JS: "black knight", QS: "black widow", KS: "executioner",
  // Diamonds (D + value sound)
  AD: "date", "2D": "dune", "3D": "dome", "4D": "door", "5D": "doll",
  "6D": "dish", "7D": "dock", "8D": "dove", "9D": "dip", TD: "dice",
  JD: "jewel thief", QD: "diamond queen", KD: "one-eyed king",
  // Clubs (hard-C + value sound)
  AC: "cat", "2C": "cone", "3C": "comb", "4C": "car", "5C": "coal",
  "6C": "cash", "7C": "cake", "8C": "coffee", "9C": "cub", TC: "case",
  JC: "leprechaun", QC: "garden queen", KC: "oak king",
};

export function positionPeg(position: number): string {
  return POSITION_PEGS[position - 1] ?? "";
}

export function defaultCardImage(card: string): string {
  return CARD_IMAGES[card] ?? "";
}
