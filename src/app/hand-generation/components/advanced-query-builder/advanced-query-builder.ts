import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  type BackendSuit,
} from '../../models/hand-generation-api.models';
import {
  type ConditionOperator,
  type QueryGroup,
  type QueryNode,
  type QueryRule,
  type SuitOption,
} from '../../models/hand-generation-ui.models';

@Component({
  selector: 'app-advanced-query-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './advanced-query-builder.html',
  styleUrl: './advanced-query-builder.scss',
})
export class AdvancedQueryBuilderComponent {
  readonly query = input.required<QueryGroup>();
  readonly suitOptions = input.required<SuitOption[]>();

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
}
