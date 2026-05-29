import { nextCard, positionOf, prevCard } from "./stack";

export type Mode =
  | "cardToPosition"
  | "positionToCard"
  | "neighbours"
  | "sequence"
  | "reverseSequence"
  | "distance";

export interface ModeInfo {
  id: Mode;
  name: string;
  description: string;
}

export const MODES: ModeInfo[] = [
  { id: "cardToPosition", name: "Card → position", description: "See a card, recall its position in the stack." },
  { id: "positionToCard", name: "Position → card", description: "See a position, recall the card that lives there." },
  { id: "sequence", name: "What comes next", description: "See a card, recall the one that follows it." },
  { id: "reverseSequence", name: "What comes before", description: "See a card, recall the one just before it." },
  { id: "neighbours", name: "Neighbours", description: "Recall the card just before or after the one shown." },
  { id: "distance", name: "How far apart", description: "See two cards, count the gap between their positions." },
];

// Modes that need a second learned card drawn alongside the focus card.
export function needsSecondCard(mode: Mode): boolean {
  return mode === "distance";
}

export interface Question {
  mode: Mode;
  focusCard: string; // the card tracked in stats for this question
  inputKind: "number" | "card";
  promptKind: "card" | "position";
  promptCard: string | null;
  promptCardB: string | null; // second card, for the distance mode
  promptPosition: number | null;
  promptText: string;
  answerNumber: number | null;
  answerCard: string | null;
}

export function buildQuestion(mode: Mode, focusCard: string, secondCard?: string): Question {
  const base = {
    mode,
    focusCard,
    promptCard: null as string | null,
    promptCardB: null as string | null,
    promptPosition: null as number | null,
    answerNumber: null as number | null,
    answerCard: null as string | null,
  };
  switch (mode) {
    case "cardToPosition":
      return {
        ...base,
        inputKind: "number",
        promptKind: "card",
        promptCard: focusCard,
        promptText: "Which position holds this card?",
        answerNumber: positionOf(focusCard),
      };
    case "positionToCard":
      return {
        ...base,
        inputKind: "card",
        promptKind: "position",
        promptPosition: positionOf(focusCard),
        promptText: "Which card sits at this position?",
        answerCard: focusCard,
      };
    case "neighbours": {
      const before = Math.random() < 0.5;
      return {
        ...base,
        inputKind: "card",
        promptKind: "card",
        promptCard: focusCard,
        promptText: before ? "Which card comes before this one?" : "Which card comes after this one?",
        answerCard: before ? prevCard(focusCard) : nextCard(focusCard),
      };
    }
    case "sequence":
      return {
        ...base,
        inputKind: "card",
        promptKind: "card",
        promptCard: focusCard,
        promptText: "Which card comes next?",
        answerCard: nextCard(focusCard),
      };
    case "reverseSequence":
      return {
        ...base,
        inputKind: "card",
        promptKind: "card",
        promptCard: focusCard,
        promptText: "Which card comes before?",
        answerCard: prevCard(focusCard),
      };
    case "distance": {
      // secondCard is supplied by the caller (a second learned card). Fall
      // back to the neighbour if somehow missing, so the type stays total.
      const other = secondCard ?? nextCard(focusCard);
      const gap = Math.abs(positionOf(focusCard) - positionOf(other));
      return {
        ...base,
        inputKind: "number",
        promptKind: "card",
        promptCard: focusCard,
        promptCardB: other,
        promptText: "How many cards apart are these?",
        answerNumber: gap,
      };
    }
  }
}
