import { CardCode, ranksForSuit } from '../models/cards';

export type SuitLines = {
  S: string;
  H: string;
  D: string;
  C: string;
};

const EMPTY_SUIT_LINES: SuitLines = {
  S: '-',
  H: '-',
  D: '-',
  C: '-',
};

export function cardsToSuitLines(cards: CardCode[] | undefined): SuitLines {
  if (!cards || cards.length === 0) {
    return EMPTY_SUIT_LINES;
  }

  return {
    S: ranksForSuit(cards, 'S'),
    H: ranksForSuit(cards, 'H'),
    D: ranksForSuit(cards, 'D'),
    C: ranksForSuit(cards, 'C'),
  };
}
