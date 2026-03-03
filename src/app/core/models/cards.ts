export const SUIT_CHARS = ['S', 'H', 'D', 'C'] as const;
export type SuitChar = typeof SUIT_CHARS[number];

export const RANK_CHARS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export type RankChar = typeof RANK_CHARS[number];

export type CardCode = `${SuitChar}${RankChar}`;

export function isCardCode(value: unknown): value is CardCode {
  return typeof value === 'string' && /^[SHDC][23456789TJQKA]$/.test(value);
}

export function assertCardCode(value: unknown, fieldName = 'card'): asserts value is CardCode {
  if (!isCardCode(value)) throw new Error(`${fieldName} must be a 2-char code like "SA" or "D7"`);
}

export interface Card {
  code: CardCode;
  suit: SuitChar;
  rank: RankChar;
}

export function parseCard(code: CardCode): Card {
  return { code, suit: code[0] as SuitChar, rank: code[1] as RankChar };
}

export const DECK: readonly CardCode[] = SUIT_CHARS.flatMap(
  (s) => RANK_CHARS.map((r) => `${s}${r}` as const),
);
