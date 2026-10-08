import { Component, input, model } from '@angular/core';

import { SUIT_CHARS, type SuitChar } from '../../../core/models/cards';
import { type Player } from '../../../core/models/players';
import { type BackendSuit, type Range, type SuitQualityRank } from '../../models/hand-generation-api.models';
import { type ConditionOperator, type HandMode, type QueryGroup, type QueryNode } from '../../models/hand-generation-ui.models';
import {
  type HandConstraintState,
  SUIT_OPTIONS,
  SUIT_QUALITY_RANK_OPTIONS,
} from '../../utils/hand-constraint-state';
import {
  createDefaultQueryGroup,
  createQueryRule,
  removeQueryNode,
  setQueryGroupOperator,
  updateQueryGroup,
  updateQueryRule,
} from '../../utils/hand-generation-query-tree';
import { PlayerHandParametersComponent } from '../player-hand-parameters/player-hand-parameters';

/**
 * Self-contained editor for the constraints of one hand: wraps app-player-hand-parameters
 * and applies its change events to a two-way bound HandConstraintState.
 */
@Component({
  selector: 'app-hand-constraint-editor',
  standalone: true,
  imports: [PlayerHandParametersComponent],
  template: `
    <app-player-hand-parameters
      [player]="player()"
      [title]="title()"
      [mode]="state().mode"
      [minPoints]="state().minPoints"
      [maxPoints]="state().maxPoints"
      [suitRanges]="state().suitRanges"
      [query]="state().query"
      [suitOptions]="suitOptions"
      [suitChars]="suitChars"
      [suitQualitySelections]="state().suitQualitySelections"
      [suitQualityRankOptions]="suitQualityRankOptions"
      (modeChange)="setMode($event)"
      (minPointsChange)="patch({ minPoints: parseNumber($event, 0) })"
      (maxPointsChange)="patch({ maxPoints: parseNumber($event, 37) })"
      (suitMinChange)="setSuitRange($event.suit, { min: parseNumber($event.value, 0) })"
      (suitMaxChange)="setSuitRange($event.suit, { max: parseNumber($event.value, 13) })"
      (suitQualityToggle)="toggleSuitQualityRank($event.suit, $event.rank)"
      (addRule)="addRule($event)"
      (addGroup)="addGroup($event)"
      (removeNode)="removeNode($event)"
      (groupOperatorChange)="setGroupOperator($event.groupId, $event.operator)"
      (ruleSuitChange)="setRuleSuit($event.ruleId, $event.suit)"
      (ruleMinChange)="setRuleBound($event.ruleId, 'min', $event.value)"
      (ruleMaxChange)="setRuleBound($event.ruleId, 'max', $event.value)"
    />
  `,
})
export class HandConstraintEditorComponent {
  readonly player = input.required<Player>();
  readonly title = input.required<string>();
  readonly state = model.required<HandConstraintState>();

  protected readonly suitOptions = SUIT_OPTIONS;
  protected readonly suitChars: SuitChar[] = [...SUIT_CHARS];
  protected readonly suitQualityRankOptions = SUIT_QUALITY_RANK_OPTIONS;

  protected patch(patch: Partial<HandConstraintState>): void {
    this.state.update((state) => ({ ...state, ...patch }));
  }

  protected setMode(mode: HandMode): void {
    this.patch({ mode });
  }

  protected setSuitRange(suit: SuitChar, patch: Partial<Range>): void {
    this.state.update((state) => ({
      ...state,
      suitRanges: {
        ...state.suitRanges,
        [suit]: { ...state.suitRanges[suit], ...patch },
      },
    }));
  }

  protected toggleSuitQualityRank(suit: BackendSuit, rank: SuitQualityRank): void {
    this.state.update((state) => {
      const selectedRanks = state.suitQualitySelections[suit];
      const nextSuitRanks = selectedRanks.includes(rank)
        ? selectedRanks.filter((selectedRank) => selectedRank !== rank)
        : selectedRanks.length < 3
          ? [...selectedRanks, rank]
          : selectedRanks;

      return {
        ...state,
        suitQualitySelections: { ...state.suitQualitySelections, [suit]: nextSuitRanks },
      };
    });
  }

  protected addRule(groupId: number): void {
    this.updateQuery((root) => updateQueryGroup(root, groupId, (group) => ({
      ...group,
      children: [...group.children, createQueryRule(nextNodeId(root))],
    })));
  }

  protected addGroup(groupId: number): void {
    this.updateQuery((root) => updateQueryGroup(root, groupId, (group) => ({
      ...group,
      children: [...group.children, createDefaultQueryGroup(nextNodeId(root))],
    })));
  }

  protected removeNode(nodeId: number): void {
    this.updateQuery((root) => removeQueryNode(root, nodeId));
  }

  protected setGroupOperator(groupId: number, operator: ConditionOperator): void {
    this.updateQuery((root) => setQueryGroupOperator(root, groupId, operator));
  }

  protected setRuleSuit(ruleId: number, suit: BackendSuit): void {
    this.updateQuery((root) => updateQueryRule(root, ruleId, (rule) => ({ ...rule, suit })));
  }

  protected setRuleBound(ruleId: number, bound: 'min' | 'max', value: string): void {
    const parsed = Math.max(0, Math.min(13, this.parseNumber(value, bound === 'min' ? 0 : 13)));
    this.updateQuery((root) => updateQueryRule(root, ruleId, (rule) => ({ ...rule, [bound]: parsed })));
  }

  private updateQuery(update: (root: QueryGroup) => QueryGroup): void {
    this.state.update((state) => ({ ...state, query: update(state.query) }));
  }

  protected parseNumber(value: string, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}

function nextNodeId(root: QueryGroup): number {
  const maxId = (node: QueryNode): number =>
    node.kind === 'rule' ? node.id : Math.max(node.id, ...node.children.map(maxId));
  return maxId(root) + 1;
}
