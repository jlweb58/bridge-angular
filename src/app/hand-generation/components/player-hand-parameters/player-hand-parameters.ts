import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';

import { type SuitChar } from '../../../core/models/cards';
import {
  type BackendSuit,
  type Player,
  type Range,
} from '../../models/hand-generation-api.models';
import {
  type ConditionOperator,
  type HandMode,
  type QueryGroup,
  type QueryNode,
  type QueryRule,
  type SuitOption,
} from '../../models/hand-generation-ui.models';

@Component({
  selector: 'app-player-hand-parameters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltip],
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

  readonly modeChange = output<HandMode>();
  readonly minPointsChange = output<string>();
  readonly maxPointsChange = output<string>();

  readonly suitMinChange = output<{ suit: SuitChar; value: string }>();
  readonly suitMaxChange = output<{ suit: SuitChar; value: string }>();

  readonly addRule = output<number>();
  readonly addGroup = output<number>();
  readonly removeNode = output<number>();
  readonly groupOperatorChange = output<{ groupId: number; operator: ConditionOperator }>();
  readonly ruleSuitChange = output<{ ruleId: number; suit: BackendSuit }>();
  readonly ruleMinChange = output<{ ruleId: number; value: string }>();
  readonly ruleMaxChange = output<{ ruleId: number; value: string }>();

  protected isQueryRule(node: QueryNode): node is QueryRule {
    return node.kind === 'rule';
  }

  protected suitOptionLabel(value: BackendSuit): string {
    return this.suitOptions().find((option) => option.value === value)?.label ?? value;
  }

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
}
