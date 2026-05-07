import {
  type ConditionGroup,
  type SuitLengthCondition,
} from '../models/hand-generation-api.models';
import {
  type ConditionOperator,
  type QueryGroup,
  type QueryRule,
} from '../models/hand-generation-ui.models';

export function createDefaultQueryGroup(id: number): QueryGroup {
  return {
    id,
    kind: 'group',
    operator: 'AND',
    children: [],
  };
}

export function createQueryRule(id: number): QueryRule {
  return {
    id,
    kind: 'rule',
    suit: 'SPADES',
    min: 0,
    max: 13,
  };
}

export function updateQueryGroup(
  root: QueryGroup,
  groupId: number,
  update: (group: QueryGroup) => QueryGroup,
): QueryGroup {
  if (root.id === groupId) {
    return update(root);
  }

  return {
    ...root,
    children: root.children.map((child) =>
      child.kind === 'group' ? updateQueryGroup(child, groupId, update) : child,
    ),
  };
}

export function updateQueryRule(
  root: QueryGroup,
  ruleId: number,
  update: (rule: QueryRule) => QueryRule,
): QueryGroup {
  return {
    ...root,
    children: root.children.map((child) => {
      if (child.kind === 'rule') {
        return child.id === ruleId ? update(child) : child;
      }

      return updateQueryRule(child, ruleId, update);
    }),
  };
}

export function removeQueryNode(root: QueryGroup, nodeId: number): QueryGroup {
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== nodeId)
      .map((child) => child.kind === 'group' ? removeQueryNode(child, nodeId) : child),
  };
}

export function toConditionGroup(group: QueryGroup): ConditionGroup {
  return {
    operator: group.operator,
    conditions: group.children.map((child): ConditionGroup | SuitLengthCondition => {
      if (child.kind === 'group') {
        return toConditionGroup(child);
      }

      return {
        suit: child.suit,
        range: {
          min: Math.min(child.min, child.max),
          max: Math.max(child.min, child.max),
        },
      };
    }).filter((condition) => {
      return 'suit' in condition || condition.conditions.length > 0;
    }),
  };
}

export function setQueryGroupOperator(
  root: QueryGroup,
  groupId: number,
  operator: ConditionOperator,
): QueryGroup {
  return updateQueryGroup(root, groupId, (group) => ({
    ...group,
    operator,
  }));
}
