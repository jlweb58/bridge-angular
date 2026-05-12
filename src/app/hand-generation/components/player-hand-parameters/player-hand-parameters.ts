import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
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

}
