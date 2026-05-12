import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';

import { type SuitChar } from '../../../core/models/cards';
import {
  type BackendSuit,
  type Player,
  type Range,
  type SuitQualityRank,
} from '../../models/hand-generation-api.models';
import {
  type ConditionOperator,
  type HandMode,
  type QueryGroup,
  type QueryNode,
  type SuitOption,
  type SuitQualityRankOption,
  type SuitQualitySelections,
} from '../../models/hand-generation-ui.models';
import { AdvancedQueryBuilderComponent } from '../advanced-query-builder/advanced-query-builder';

@Component({
  selector: 'app-player-hand-parameters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltip, AdvancedQueryBuilderComponent],
  templateUrl: './player-hand-parameters.html',
  styleUrl: './player-hand-parameters.scss',
})
export class PlayerHandParametersComponent {
  readonly player = input.required<Player>();
  readonly title = input.required<string>();
  readonly mode = input.required<HandMode>();
  readonly minPoints = input.required<number>();
  readonly maxPoints = input.required<number>();
  readonly suitRanges = input.required<Record<SuitChar, Range>>();
  readonly query = input.required<QueryGroup>();
  readonly suitOptions = input.required<SuitOption[]>();
  readonly suitChars = input.required<SuitChar[]>();
  readonly suitQualitySelections = input.required<SuitQualitySelections>();
  readonly suitQualityRankOptions = input.required<SuitQualityRankOption[]>();

  protected readonly suitQualityExpanded = signal(false);

  readonly modeChange = output<HandMode>();
  readonly minPointsChange = output<string>();
  readonly maxPointsChange = output<string>();

  readonly suitMinChange = output<{ suit: SuitChar; value: string }>();
  readonly suitMaxChange = output<{ suit: SuitChar; value: string }>();

  readonly suitQualityToggle = output<{ suit: BackendSuit; rank: SuitQualityRank }>();

  readonly addRule = output<number>();
  readonly addGroup = output<number>();
  readonly removeNode = output<number>();
  readonly groupOperatorChange = output<{ groupId: number; operator: ConditionOperator }>();
  readonly ruleSuitChange = output<{ ruleId: number; suit: BackendSuit }>();
  readonly ruleMinChange = output<{ ruleId: number; value: string }>();
  readonly ruleMaxChange = output<{ ruleId: number; value: string }>();

  protected suitSymbol(suit: SuitChar): string {
    switch (suit) {
      case 'S': return '♠';
      case 'H': return '♥';
      case 'D': return '♦';
      case 'C': return '♣';
    }
  }

  protected isRedSuit(suit: SuitChar): boolean {
    return suit === 'H' || suit === 'D';
  }

  protected isSuitQualityRankSelected(suit: BackendSuit, rank: SuitQualityRank): boolean {
    return this.suitQualitySelections()[suit].includes(rank);
  }

  protected isSuitQualityDisabled(suit: BackendSuit, rank: SuitQualityRank): boolean {
    const selectedRanks = this.suitQualitySelections()[suit];
    return selectedRanks.length >= 3 && !selectedRanks.includes(rank);
  }

  protected toggleSuitQualityExpanded(): void {
    this.suitQualityExpanded.update((expanded) => !expanded);
  }

  protected hasSuitQualityAvailableSuits(): boolean {
    return this.suitOptions().some((suit) => this.isSuitQualityAvailable(suit.value));
  }

  protected isSuitQualityAvailable(suit: BackendSuit): boolean {
    if (this.mode() === 'basic') {
      return this.suitRanges()[this.toSuitChar(suit)].min >= 5;
    }

    return this.queryContainsSuitWithMinimumLength(this.query(), suit);
  }

  private queryContainsSuitWithMinimumLength(node: QueryNode, suit: BackendSuit): boolean {
    if (node.kind === 'rule') {
      return node.suit === suit && node.min >= 5;
    }

    return node.children.some((child) => this.queryContainsSuitWithMinimumLength(child, suit));
  }

  private toSuitChar(suit: BackendSuit): SuitChar {
    switch (suit) {
      case 'SPADES': return 'S';
      case 'HEARTS': return 'H';
      case 'DIAMONDS': return 'D';
      case 'CLUBS': return 'C';
    }
  }
}
