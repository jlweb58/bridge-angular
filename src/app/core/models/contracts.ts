export const DENOMINATIONS = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS', 'NOTRUMP'] as const;
export type Denomination = typeof DENOMINATIONS[number];

export const DENOMINATION_META: Record<Denomination, { symbol: 'S' | 'H' | 'D' | 'C' | 'NT'; ddsIndex: 0 | 1 | 2 | 3 | 4 }> = {
  SPADES:   { symbol: 'S',  ddsIndex: 0 },
  HEARTS:   { symbol: 'H',  ddsIndex: 1 },
  DIAMONDS: { symbol: 'D',  ddsIndex: 2 },
  CLUBS:    { symbol: 'C',  ddsIndex: 3 },
  NOTRUMP:  { symbol: 'NT', ddsIndex: 4 },
} as const;

export function denominationSymbol(d: Denomination) {
  return DENOMINATION_META[d].symbol;
}

export function denominationDdsIndex(d: Denomination) {
  return DENOMINATION_META[d].ddsIndex;
}

// --- Strain (same values, different meaning) ---
export const STRAINS = DENOMINATIONS;
export type Strain = Denomination;

export const LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Level = typeof LEVELS[number];
