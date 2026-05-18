export const SUIT_CHARS = ['S', 'H', 'D', 'C'] as const;
export type SuitChar = typeof SUIT_CHARS[number];

export const RANK_CHARS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export type RankChar = typeof RANK_CHARS[number];

export const BRIDGE_RANK_ORDER_DESC = 'AKQJT98765432';

export type CardCode = `${SuitChar}${RankChar}`;
export interface Card {
  code: CardCode;
  suit: SuitChar;
  rank: RankChar;
}

export const DECK: readonly CardCode[] = SUIT_CHARS.flatMap(
  (s) => RANK_CHARS.map((r) => `${s}${r}` as const),
);

export function compareCardsByRankDesc(a: CardCode, b: CardCode): number {
  return BRIDGE_RANK_ORDER_DESC.indexOf(a[1]) - BRIDGE_RANK_ORDER_DESC.indexOf(b[1]);
}

export function compareCardsBySuitThenRankDesc(a: CardCode, b: CardCode): number {
  const suitDiff = SUIT_CHARS.indexOf(a[0] as SuitChar) - SUIT_CHARS.indexOf(b[0] as SuitChar);

  if (suitDiff !== 0) {
    return suitDiff;
  }

  return compareCardsByRankDesc(a, b);
}

export function ranksForSuit(cards: CardCode[] | undefined, suit: SuitChar, emptyValue = '-'): string {
  const ranks = (cards ?? [])
    .filter((card) => card[0] === suit)
    .sort(compareCardsByRankDesc)
    .map((card) => card[1])
    .join('');

  return ranks || emptyValue;
}
