import type { Player } from './players';
import type { CardCode } from './cards';

export type HandsByPlayer = Partial<Record<Player, CardCode[]>>;

export interface Deal {
  /** The board number from [Board "..."] if present */
  board?: string;

  /** The dealer from [Dealer "..."] if present */
  dealer?: Player;

  first: Player;
  hands: HandsByPlayer;
}
