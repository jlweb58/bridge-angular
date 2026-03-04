import type { Deal } from './deal';
import type { Player } from './players';
import type { CardCode } from './cards';

const PBN_TO_PLAYER: Record<'N' | 'E' | 'S' | 'W', Player> = {
  N: 'NORTH',
  E: 'EAST',
  S: 'SOUTH',
  W: 'WEST',
};

const NEXT_PLAYER: Record<Player, Player> = {
  NORTH: 'EAST',
  EAST: 'SOUTH',
  SOUTH: 'WEST',
  WEST: 'NORTH',
};

function parseDealTagValue(pbnText: string): string {
  const m = pbnText.match(/\[Deal\s+"([^"]+)"\]/i);
  if (!m) throw new Error('PBN is missing a [Deal "..."] tag.');
  return m[1].trim();
}

function parseDealerTagValue(pbnText: string): Player | undefined {
  const m = pbnText.match(/\[Dealer\s+"([NESW])"\]/i);
  if (!m) return undefined;
  const ch = m[1].toUpperCase() as 'N' | 'E' | 'S' | 'W';
  return PBN_TO_PLAYER[ch];
}


function parsePbnHandToCardCodes(hand: string): CardCode[] {
  // PBN order is S.H.D.C
  const parts = hand.split('.');
  if (parts.length !== 4) {
    throw new Error(`Invalid hand "${hand}". Expected 4 suits separated by dots (S.H.D.C).`);
  }

  const suitChars = ['S', 'H', 'D', 'C'] as const;
  const cards: CardCode[] = [];

  for (let i = 0; i < 4; i++) {
    const suit = suitChars[i];
    const ranks = parts[i].trim();

    if (ranks === '-' || ranks === '') continue;

    for (const r of ranks) {
      // PBN uses T for 10
      if (!'23456789TJQKA'.includes(r)) {
        throw new Error(`Invalid rank "${r}" in suit "${suit}" for hand "${hand}".`);
      }
      cards.push(`${suit}${r}` as CardCode);
    }
  }

  return cards;
}

function assert52UniqueCards(deal: Deal): void {
  const all = (Object.values(deal.hands).flat() as CardCode[]).filter(Boolean);
  const set = new Set(all);
  if (all.length !== 52) throw new Error(`Expected 52 cards total, got ${all.length}.`);
  if (set.size !== all.length) throw new Error(`Duplicate card detected in PBN deal.`);
}

export function parsePbnToDeal(pbnText: string): Deal {
  const dealValue = parseDealTagValue(pbnText);

  const colonIdx = dealValue.indexOf(':');
  if (colonIdx < 0) throw new Error(`Invalid Deal value "${dealValue}". Expected like N:...`);

  const firstChar = dealValue.slice(0, colonIdx).trim().toUpperCase();
  if (!['N', 'E', 'S', 'W'].includes(firstChar)) {
    throw new Error(`Invalid dealer in Deal tag: "${firstChar}". Expected N/E/S/W.`);
  }

  const first = PBN_TO_PLAYER[firstChar as 'N' | 'E' | 'S' | 'W'];
  const handsPart = dealValue.slice(colonIdx + 1).trim();

  // 4 hands, starting with `first`, in order clockwise
  const handTokens = handsPart.split(/\s+/).filter(Boolean);
  if (handTokens.length !== 4) {
    throw new Error(
      `Expected 4 hands after "${firstChar}:" but got ${handTokens.length}.`,
    );
  }

  const p1 = first;
  const p2 = NEXT_PLAYER[p1];
  const p3 = NEXT_PLAYER[p2];
  const p4 = NEXT_PLAYER[p3];

  const deal: Deal = {
    dealer: parseDealerTagValue(pbnText),
    first,
    hands: {
      [p1]: parsePbnHandToCardCodes(handTokens[0]),
      [p2]: parsePbnHandToCardCodes(handTokens[1]),
      [p3]: parsePbnHandToCardCodes(handTokens[2]),
      [p4]: parsePbnHandToCardCodes(handTokens[3]),
    },
  };

  assert52UniqueCards(deal);
  return deal;
}
