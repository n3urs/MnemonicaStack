import { nextCard, positionOf, prevCard } from "./stack";

export type Mode = "cardToPosition" | "positionToCard" | "neighbours" | "sequence";

export interface ModeInfo {
  id: Mode;
  name: string;
  description: string;
}

export const MODES: ModeInfo[] = [
  { id: "cardToPosition", name: "Card → position", description: "See a card, recall its position in the stack." },
  { id: "positionToCard", name: "Position → card", description: "See a position, recall the card that lives there." },
  { id: "neighbours", name: "Neighbours", description: "Recall the card just before or after the one shown." },
  { id: "sequence", name: "Sequence", description: "See a card, recall the one that follows it." },
];

export interface Question {
  mode: Mode;
  focusCard: string; // the card tracked in stats for this question
  inputKind: "number" | "card";
  promptKind: "card" | "position";
  promptCard: string | null;
  promptPosition: number | null;
  promptText: string;
  answerNumber: number | null;
  answerCard: string | null;
}

export function buildQuestion(mode: Mode, focusCard: string): Question {
  switch (mode) {
    case "cardToPosition":
      return {
        mode,
        focusCard,
        inputKind: "number",
        promptKind: "card",
        promptCard: focusCard,
        promptPosition: null,
        promptText: "Which position holds this card?",
        answerNumber: positionOf(focusCard),
        answerCard: null,
      };
    case "positionToCard":
      return {
        mode,
        focusCard,
        inputKind: "card",
        promptKind: "position",
        promptCard: null,
        promptPosition: positionOf(focusCard),
        promptText: "Which card sits at this position?",
        answerNumber: null,
        answerCard: focusCard,
      };
    case "neighbours": {
      const before = Math.random() < 0.5;
      return {
        mode,
        focusCard,
        inputKind: "card",
        promptKind: "card",
        promptCard: focusCard,
        promptPosition: null,
        promptText: before ? "Which card comes before this one?" : "Which card comes after this one?",
        answerNumber: null,
        answerCard: before ? prevCard(focusCard) : nextCard(focusCard),
      };
    }
    case "sequence":
      return {
        mode,
        focusCard,
        inputKind: "card",
        promptKind: "card",
        promptCard: focusCard,
        promptPosition: null,
        promptText: "Which card comes next?",
        answerNumber: null,
        answerCard: nextCard(focusCard),
      };
  }
}
