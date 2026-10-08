import { buildHandConstraint, createHandConstraintState } from './hand-constraint-state';
import { createQueryRule } from './hand-generation-query-tree';

describe('buildHandConstraint', () => {
  it('builds a basic distribution constraint', () => {
    const state = createHandConstraintState();
    state.minPoints = 10;
    state.maxPoints = 12;
    state.suitRanges = { ...state.suitRanges, S: { min: 5, max: 7 } };

    expect(buildHandConstraint(state)).toEqual({
      minPoints: 10,
      maxPoints: 12,
      handDistribution: {
        suitLengths: {
          S: { min: 5, max: 7 },
          H: { min: 0, max: 13 },
          D: { min: 0, max: 13 },
          C: { min: 0, max: 13 },
        },
      },
    });
  });

  it('only includes suit quality for suits of at least 5 cards', () => {
    const state = createHandConstraintState();
    state.suitRanges = { ...state.suitRanges, S: { min: 5, max: 7 } };
    state.suitQualitySelections = { ...state.suitQualitySelections, SPADES: ['ACE', 'KING'], HEARTS: ['QUEEN'] };

    expect(buildHandConstraint(state).suitQualityRequirements).toEqual({
      SPADES: { minimumRanks: ['ACE', 'KING'] },
    });
  });

  it('uses the condition tree in advanced mode', () => {
    const state = createHandConstraintState();
    state.mode = 'advanced';
    state.query = { ...state.query, children: [{ ...createQueryRule(2), suit: 'HEARTS', min: 6, max: 4 }] };

    const constraint = buildHandConstraint(state);

    expect(constraint.handDistribution).toBeUndefined();
    expect(constraint.condition).toEqual({
      operator: 'AND',
      conditions: [{ suit: 'HEARTS', range: { min: 4, max: 6 } }],
    });
  });

  it('falls back to the distribution when the advanced query is empty', () => {
    const state = createHandConstraintState();
    state.mode = 'advanced';

    expect(buildHandConstraint(state).handDistribution).toBeDefined();
  });
});
