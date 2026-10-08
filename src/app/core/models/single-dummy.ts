import type { Player } from './players';
import type { Denomination, Level } from './contracts';
import type { CardCode } from './cards';
import type { HandConstraint, HandEvaluator } from '../../hand-generation/models/hand-generation-api.models';

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
   * Declarer must have 13 cards; dummy too unless it is constrained instead.
   * Defenders' cards are ignored (they are always dealt randomly).
   * Values are 2-char card codes like "SA".
   */
  hands: HandsByPlayer;

  /**
   * Optional constraints for the dummy and/or the defenders (never the declarer).
   * A constrained dummy must not also be given in `hands`.
   */
  constraints?: Partial<Record<Player, HandConstraint>>;

  /** Point-count method used by the constraints; server defaults to 'standard'. */
  evaluator?: HandEvaluator;

  /** Must be > 0 (server validates) */
  samples: number;

  /** Optional; if omitted or null server generates one */
  seed?: number | null;
}

export interface SingleDummyAnalyzeResponse {
  /** May be fewer than requested if the constraints are very restrictive. */
  samples: number;
  successes: number;
  successProbability: number; // Java double -> TS number
  confidence95: ConfidenceInterval95;
  tricksHistogram: Record<number, number>; // Map<Integer,Integer> serialized as an object with string keys in JSON
}

export interface ConfidenceInterval95 {
  low: number;
  high: number;
}
