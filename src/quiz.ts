import { nextCard, positionOf, prevCard } from "./stack";

export type Mode = "cardToPosition" | "positionToCard" | "neighbour" | "distance";

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
  direction: "next" | "before" | null; // for the neighbour mode's big label
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
    direction: null as "next" | "before" | null,
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
    case "neighbour": {
      // Randomly ask for the card before or after — the direction is shown in
      // big text so it's unambiguous.
      const before = Math.random() < 0.5;
      return {
        ...base,
        inputKind: "card",
        promptKind: "card",
        promptCard: focusCard,
        direction: before ? "before" : "next",
        promptText: before ? "Which card comes before?" : "Which card comes next?",
        answerCard: before ? prevCard(focusCard) : nextCard(focusCard),
      };
    }
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
