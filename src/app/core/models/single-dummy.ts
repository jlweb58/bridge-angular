import type { Player } from './players';
import type { Denomination, Level } from './contracts';
import type { CardCode } from './cards';

export interface SingleDummyContract {
  level: Level;
  denomination: Denomination;
}

export type HandsByPlayer = Partial<Record<Player, CardCode[]>>;

export interface SingleDummyAnalyzeRequest {
  declarer: Player;
  dummy: Player;
  contract: SingleDummyContract;

  /**
   * Only declarer + dummy required.
   * Values are 2-char card codes like "SA".
   */
  hands: HandsByPlayer;

  /** Must be > 0 (server validates) */
  samples: number;

  /** Optional; if omitted or null server generates one */
  seed?: number | null;
}
