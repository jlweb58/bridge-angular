import { type SuitChar } from '../../core/models/cards';
import {
  type BackendSuit,
  type HandConstraint,
  type Range,
  type SuitQualityRequirement,
} from '../models/hand-generation-api.models';
import {
  type EvaluatorOption,
  type HandMode,
  type QueryGroup,
  type QueryNode,
  type SuitOption,
  type SuitQualityRankOption,
  type SuitQualitySelections,
} from '../models/hand-generation-ui.models';
import { createDefaultQueryGroup, toConditionGroup } from './hand-generation-query-tree';

/** UI state of the constraints for a single hand (as edited by app-player-hand-parameters). */
export interface HandConstraintState {
  mode: HandMode;
  minPoints: number;
  maxPoints: number;
  suitRanges: Record<SuitChar, Range>;
  query: QueryGroup;
  suitQualitySelections: SuitQualitySelections;
}

export const SUIT_OPTIONS: SuitOption[] = [
  { label: 'Spades', value: 'SPADES', symbol: '♠', red: false },
  { label: 'Hearts', value: 'HEARTS', symbol: '♥', red: true },
  { label: 'Diamonds', value: 'DIAMONDS', symbol: '♦', red: true },
  { label: 'Clubs', value: 'CLUBS', symbol: '♣', red: false },
];

export const SUIT_QUALITY_RANK_OPTIONS: SuitQualityRankOption[] = [
  { label: 'A', value: 'ACE' },
  { label: 'K', value: 'KING' },
  { label: 'Q', value: 'QUEEN' },
  { label: 'J', value: 'JACK' },
  { label: 'T', value: 'TEN' },
  { label: '9', value: 'NINE' },
  { label: '8', value: 'EIGHT' },
];

export const EVALUATOR_OPTIONS: EvaluatorOption[] = [
  { label: 'Standard', value: 'standard' },
  { label: 'Kaplan-Rubens', value: 'kaplan-rubens' },
  { label: 'Bergen', value: 'bergen' },
];

export function createEmptySuitQualitySelections(): SuitQualitySelections {
  return {
    SPADES: [],
    HEARTS: [],
    DIAMONDS: [],
    CLUBS: [],
  };
}

/** An unconstrained hand: 0-37 points, any shape. */
export function createHandConstraintState(queryRootId = 1): HandConstraintState {
  return {
    mode: 'basic',
    minPoints: 0,
    maxPoints: 37,
    suitRanges: {
      S: { min: 0, max: 13 },
      H: { min: 0, max: 13 },
      D: { min: 0, max: 13 },
      C: { min: 0, max: 13 },
    },
    query: createDefaultQueryGroup(queryRootId),
    suitQualitySelections: createEmptySuitQualitySelections(),
  };
}

/** Converts the UI state into the backend's HandGenerationParameters JSON. */
export function buildHandConstraint(state: HandConstraintState): HandConstraint {
  const base = {
    minPoints: state.minPoints,
    maxPoints: state.maxPoints,
  };
  const suitQualityRequirements = buildSuitQualityRequirements(state);
  const quality = Object.keys(suitQualityRequirements).length > 0 ? { suitQualityRequirements } : {};

  if (state.mode === 'advanced') {
    const condition = toConditionGroup(state.query);

    if (condition.conditions.length > 0) {
      return { ...base, condition, ...quality };
    }
  }

  return {
    ...base,
    handDistribution: {
      suitLengths: state.suitRanges,
    },
    ...quality,
  };
}

export function toSuitChar(suit: BackendSuit): SuitChar {
  switch (suit) {
    case 'SPADES': return 'S';
    case 'HEARTS': return 'H';
    case 'DIAMONDS': return 'D';
    case 'CLUBS': return 'C';
  }
}

function buildSuitQualityRequirements(
  state: HandConstraintState,
): Partial<Record<BackendSuit, SuitQualityRequirement>> {
  return SUIT_OPTIONS.reduce<Partial<Record<BackendSuit, SuitQualityRequirement>>>((requirements, suitOption) => {
    const selectedRanks = state.suitQualitySelections[suitOption.value];

    if (selectedRanks.length === 0) {
      return requirements;
    }

    if (!isSuitAtLeastFiveCards(state, suitOption.value)) {
      return requirements;
    }

    requirements[suitOption.value] = {
      minimumRanks: selectedRanks.slice(0, 3),
    };

    return requirements;
  }, {});
}

function isSuitAtLeastFiveCards(state: HandConstraintState, suit: BackendSuit): boolean {
  if (state.mode === 'basic') {
    return state.suitRanges[toSuitChar(suit)].min >= 5;
  }

  return queryContainsSuitWithFiveCardPotential(state.query, suit);
}

function queryContainsSuitWithFiveCardPotential(node: QueryNode, suit: BackendSuit): boolean {
  if (node.kind === 'rule') {
    return node.suit === suit && node.min >= 5;
  }

  return node.children.some((child) => queryContainsSuitWithFiveCardPotential(child, suit));
}
