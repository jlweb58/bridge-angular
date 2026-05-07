import {
  type BackendSuit,
  type ContractDenomination,
  type HandEvaluator,
} from './hand-generation-api.models';

export interface EvaluatorOption {
  label: string;
  value: HandEvaluator;
}

export interface ContractInputRow {
  level: number | null;
  denomination: ContractDenomination | '';
  added: boolean;
}

export type HandMode = 'basic' | 'advanced';

export type ConditionOperator = 'AND' | 'OR';

export interface QueryRule {
  id: number;
  kind: 'rule';
  suit: BackendSuit;
  min: number;
  max: number;
}

export interface QueryGroup {
  id: number;
  kind: 'group';
  operator: ConditionOperator;
  children: QueryNode[];
}

export type QueryNode = QueryGroup | QueryRule;

export interface SuitOption {
  label: string;
  value: BackendSuit;
  symbol: string;
  red: boolean;
}
