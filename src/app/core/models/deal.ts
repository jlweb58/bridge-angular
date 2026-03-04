import type { Player } from './players';
import type { CardCode } from './cards';

export type HandsByPlayer = Partial<Record<Player, CardCode[]>>;

export interface Deal {
  /** The dealer from [Dealer "..."] if present */
  dealer?: Player;

  first: Player;
  hands: HandsByPlayer;
}
