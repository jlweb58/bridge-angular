import { type CardCode, type SuitChar } from '../../core/models/cards';

export type Player = 'WEST' | 'EAST';

export interface Range {
  min: number;
  max: number;
}

export type BackendSuit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export type SuitQualityRank = 'ACE' | 'KING' | 'QUEEN' | 'JACK' | 'TEN' | 'NINE' | 'EIGHT';

export interface SuitQualityRequirement {
  minimumRanks: SuitQualityRank[];
}

export interface SuitLengthCondition {
  suit: BackendSuit;
  range: Range;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Array<ConditionGroup | SuitLengthCondition>;
}

export interface HandConstraint {
  minPoints: number;
  maxPoints: number;
  handDistribution?: {
    suitLengths: Record<SuitChar, Range>;
  };
  condition?: ConditionGroup;
  suitQualityRequirements?: Partial<Record<BackendSuit, SuitQualityRequirement>>;
}

export type HandEvaluator = 'standard' | 'kaplan-rubens' | 'bergen';

export type ContractDenomination = 'CLUBS' | 'DIAMONDS' | 'HEARTS' | 'SPADES' | 'NOTRUMP';

export interface ContractSuggestion {
  level: number;
  denomination: ContractDenomination;
}

export interface ContractScore {
  contract: ContractSuggestion;
  successProbability: number;
  rank: number;
}

export interface HandGenerationRequest {
  parameters: Record<Player, HandConstraint>;
  numberOfHands: number;
  evaluator: HandEvaluator;
  contractSuggestions?: ContractSuggestion[];
}

export interface GeneratedHandPair {
  dealer: Player;
  vulnerability: string;
  WEST: CardCode[];
  EAST: CardCode[];
  contractScores?: ContractScore[];
}

export interface HandGenerationResponse {
  hands: GeneratedHandPair[];
}
