import {
  createDefaultQueryGroup,
  createQueryRule,
  removeQueryNode,
  toConditionGroup,
  updateQueryGroup,
  updateQueryRule,
} from './hand-generation-query-tree';

describe('hand-generation-query-tree', () => {
  it('creates a default query group', () => {
    expect(createDefaultQueryGroup(1)).toEqual({
      id: 1,
      kind: 'group',
      operator: 'AND',
      children: [],
    });
  });

  it('creates a default query rule', () => {
    expect(createQueryRule(2)).toEqual({
      id: 2,
      kind: 'rule',
      suit: 'SPADES',
      min: 0,
      max: 13,
    });
  });

  it('updates a nested group', () => {
    const root = {
      id: 1,
      kind: 'group' as const,
      operator: 'AND' as const,
      children: [
        {
          id: 2,
          kind: 'group' as const,
          operator: 'AND' as const,
          children: [],
        },
      ],
    };

    const updated = updateQueryGroup(root, 2, (group) => ({
      ...group,
      operator: 'OR',
    }));

    expect(updated.children[0]).toEqual({
      id: 2,
      kind: 'group',
      operator: 'OR',
      children: [],
    });
  });

  it('updates a nested rule', () => {
    const root = {
      id: 1,
      kind: 'group' as const,
      operator: 'AND' as const,
      children: [
        {
          id: 2,
          kind: 'rule' as const,
          suit: 'SPADES' as const,
          min: 0,
          max: 13,
        },
      ],
    };

    const updated = updateQueryRule(root, 2, (rule) => ({
      ...rule,
      suit: 'HEARTS',
      min: 3,
    }));

    expect(updated.children[0]).toEqual({
      id: 2,
      kind: 'rule',
      suit: 'HEARTS',
      min: 3,
      max: 13,
    });
  });

  it('removes a nested node', () => {
    const root = {
      id: 1,
      kind: 'group' as const,
      operator: 'AND' as const,
      children: [
        {
          id: 2,
          kind: 'rule' as const,
          suit: 'SPADES' as const,
          min: 0,
          max: 13,
        },
      ],
    };

    expect(removeQueryNode(root, 2).children).toEqual([]);
  });

  it('normalizes rule min and max when converting to condition group', () => {
    const root = {
      id: 1,
      kind: 'group' as const,
      operator: 'AND' as const,
      children: [
        {
          id: 2,
          kind: 'rule' as const,
          suit: 'HEARTS' as const,
          min: 5,
          max: 2,
        },
      ],
    };

    expect(toConditionGroup(root)).toEqual({
      operator: 'AND',
      conditions: [
        {
          suit: 'HEARTS',
          range: {
            min: 2,
            max: 5,
          },
        },
      ],
    });
  });

  it('filters empty nested groups when converting to condition group', () => {
    const root = {
      id: 1,
      kind: 'group' as const,
      operator: 'AND' as const,
      children: [
        {
          id: 2,
          kind: 'group' as const,
          operator: 'OR' as const,
          children: [],
        },
      ],
    };

    expect(toConditionGroup(root)).toEqual({
      operator: 'AND',
      conditions: [],
    });
  });
});
