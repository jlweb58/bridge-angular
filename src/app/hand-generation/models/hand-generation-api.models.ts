import { type CardCode, type SuitChar } from '../../core/models/cards';
import {Player} from '../../core/models/players';

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

export type Vulnerability = 'NONE' | 'NS' | 'EW' | 'BOTH';

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
  parameters: Partial<Record<Player, HandConstraint>>;
  numberOfHands: number;
  evaluator: HandEvaluator;
  contractSuggestions?: ContractSuggestion[];
}

export interface GeneratedHandPair {
  dealer: Player;
  vulnerability: Vulnerability;
  hands: Partial<Record<Player, CardCode[]>>;
  contractScores?: ContractScore[];
}

export interface HandGenerationResponse {
  hands: GeneratedHandPair[];
}
