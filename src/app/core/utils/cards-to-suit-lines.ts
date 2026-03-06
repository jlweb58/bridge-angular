import type { CardCode } from '../models/cards';

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

const RANK_ORDER = 'AKQJT98765432';

export function cardsToSuitLines(cards: CardCode[] | undefined): SuitLines {
  if (!cards || cards.length === 0) {
    return EMPTY_SUIT_LINES;
  }

  const bySuit: Record<'S' | 'H' | 'D' | 'C', string[]> = {
    S: [],
    H: [],
    D: [],
    C: [],
  };

  for (const card of cards) {
    const suit = card[0] as 'S' | 'H' | 'D' | 'C';
    const rank = card[1];
    bySuit[suit].push(rank);
  }

  const sortRanks = (ranks: string[]) =>
    [...ranks].sort((a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b)).join('');

  return {
    S: sortRanks(bySuit.S) || '-',
    H: sortRanks(bySuit.H) || '-',
    D: sortRanks(bySuit.D) || '-',
    C: sortRanks(bySuit.C) || '-',
  };
}
