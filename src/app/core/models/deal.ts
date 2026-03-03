import type { Player } from './players';
import type { CardCode } from './cards';

export type HandsByPlayer = Partial<Record<Player, CardCode[]>>;

export interface Deal {
  first: Player;
  hands: HandsByPlayer;
}
