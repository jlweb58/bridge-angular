import { type CardCode } from '../../core/models/cards';
import { type Player } from '../../core/models/players';
import { type GeneratedHandPair } from '../models/hand-generation-api.models';

type LegacyGeneratedHandPair = GeneratedHandPair & Partial<Record<Player, CardCode[]>>;

export function normalizeGeneratedHand(hand: LegacyGeneratedHandPair): GeneratedHandPair {
  return {
    ...hand,
    hands: {
      ...(hand.hands ?? {}),
      WEST: hand.hands?.WEST ?? hand.WEST,
      EAST: hand.hands?.EAST ?? hand.EAST,
      NORTH: hand.hands?.NORTH ?? hand.NORTH,
      SOUTH: hand.hands?.SOUTH ?? hand.SOUTH,
    },
  };
}
