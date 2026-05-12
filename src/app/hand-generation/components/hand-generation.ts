import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { finalize } from 'rxjs';

import { type SuitChar } from '../../core/models/cards';
import {
  type BackendSuit,
  type ContractDenomination,
  type ContractScore,
  type GeneratedHandPair,
  type HandEvaluator,
  type HandGenerationRequest,
  type Player,
  type Range,
  type SuitQualityRank,
  type SuitQualityRequirement,
} from '../models/hand-generation-api.models';
import {
  type ConditionOperator,
  type ContractInputRow,
  type EvaluatorOption,
  type HandMode,
  type QueryGroup, QueryNode,
  type SuitOption,
  type SuitQualityRankOption,
  type SuitQualitySelections,
} from '../models/hand-generation-ui.models';
import { HandGenerationPdfService } from '../services/hand-generation-pdf.service';
import { HandGenerationService } from '../services/hand-generation.service';
import {
  createDefaultQueryGroup,
  createQueryRule,
  removeQueryNode,
  setQueryGroupOperator,
  toConditionGroup,
  updateQueryGroup,
  updateQueryRule,
} from '../utils/hand-generation-query-tree';
import { GeneratedHandsViewComponent } from './generated-hands-view';
import { PlayerHandParametersComponent } from './player-hand-parameters/player-hand-parameters';

@Component({
  selector: 'app-hand-generation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GeneratedHandsViewComponent,
    MatTooltip,
    PlayerHandParametersComponent,
  ],
  templateUrl: './hand-generation.html',
  styleUrl: './hand-generation.scss',
})
export class HandGeneration {
  private readonly handGenerationService = inject(HandGenerationService);
  private readonly handGenerationPdfService = inject(HandGenerationPdfService);

  protected readonly isLoading = signal(false);
  protected readonly isExporting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly results = signal<GeneratedHandPair[]>([]);
  protected readonly contractScores = signal<ContractScore[]>([]);
  protected readonly elapsedSeconds = signal(0);

  private generationStartedAtMs: number | null = null;
  private generationTimerId: ReturnType<typeof setInterval> | null = null;
  private nextQueryNodeId = 1;

  protected readonly numberOfHands = signal(10);
  protected readonly evaluatorOptions: EvaluatorOption[] = [
    { label: 'Standard', value: 'standard' },
    { label: 'Kaplan-Rubens', value: 'kaplan-rubens' },
    { label: 'Bergen', value: 'bergen' },
  ];
  protected readonly selectedEvaluator = signal<HandEvaluator>('standard');
  protected readonly randomizeHands = signal(false);

  protected readonly denominationOptions: ContractDenomination[] = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES', 'NOTRUMP'];
  protected readonly contractSuggestions = signal<ContractInputRow[]>([{ level: null, denomination: '', added: false }]);

  protected readonly westMinPoints = signal(15);
  protected readonly westMaxPoints = signal(17);
  protected readonly eastMinPoints = signal(8);
  protected readonly eastMaxPoints = signal(12);

  protected readonly westMode = signal<HandMode>('basic');
  protected readonly eastMode = signal<HandMode>('basic');

  protected readonly suitOptions: SuitOption[] = [
    { label: 'Spades', value: 'SPADES', symbol: '♠', red: false },
    { label: 'Hearts', value: 'HEARTS', symbol: '♥', red: true },
    { label: 'Diamonds', value: 'DIAMONDS', symbol: '♦', red: true },
    { label: 'Clubs', value: 'CLUBS', symbol: '♣', red: false },
  ];

  protected readonly suitQualityRankOptions: SuitQualityRankOption[] = [
    { label: 'A', value: 'ACE' },
    { label: 'K', value: 'KING' },
    { label: 'Q', value: 'QUEEN' },
    { label: 'J', value: 'JACK' },
    { label: 'T', value: 'TEN' },
    { label: '9', value: 'NINE' },
    { label: '8', value: 'EIGHT' },
  ];

  protected readonly westQuery = signal<QueryGroup>(this.createNextDefaultQueryGroup());
  protected readonly eastQuery = signal<QueryGroup>(this.createNextDefaultQueryGroup());

  protected readonly westSuitQualitySelections = signal<SuitQualitySelections>(this.createEmptySuitQualitySelections());
  protected readonly eastSuitQualitySelections = signal<SuitQualitySelections>(this.createEmptySuitQualitySelections());

  protected readonly westSuitRanges = signal<Record<SuitChar, Range>>({
    S: { min: 2, max: 4 },
    H: { min: 2, max: 4 },
    D: { min: 2, max: 5 },
    C: { min: 2, max: 5 },
  });

  protected readonly eastSuitRanges = signal<Record<SuitChar, Range>>({
    S: { min: 4, max: 4 },
    H: { min: 4, max: 4 },
    D: { min: 1, max: 5 },
    C: { min: 1, max: 5 },
  });

  protected readonly suitChars: SuitChar[] = ['S', 'H', 'D', 'C'];

  protected generate(): void {
    const request: HandGenerationRequest = {
      parameters: {
        WEST: this.buildPlayerConstraint(
          this.westMinPoints(),
          this.westMaxPoints(),
          this.westMode(),
          this.westSuitRanges(),
          this.westQuery(),
          this.westSuitQualitySelections(),
        ),
        EAST: this.buildPlayerConstraint(
          this.eastMinPoints(),
          this.eastMaxPoints(),
          this.eastMode(),
          this.eastSuitRanges(),
          this.eastQuery(),
          this.eastSuitQualitySelections(),
        ),
      },
      numberOfHands: this.numberOfHands(),
      evaluator: this.selectedEvaluator(),
    };

    const normalizedContracts = this.contractSuggestions()
      .filter((row) => row.added && row.level !== null && row.denomination !== '')
      .map((row) => ({
        level: Math.max(1, Math.min(7, Number(row.level))),
        denomination: row.denomination as ContractDenomination,
      }))
      .slice(0, 4);

    if (normalizedContracts.length > 0) {
      request.contractSuggestions = normalizedContracts;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.startGenerationTimer();

    this.handGenerationService
      .generateHands(request)
      .pipe(finalize(() => {
        this.isLoading.set(false);
        this.stopGenerationTimer();
      }))
      .subscribe({
        next: (response) => {
          const hands = this.randomizeHands()
            ? this.randomizeEastWestHands(response.hands ?? [])
            : response.hands ?? [];

          this.results.set(hands);
          const allScores = hands.flatMap((hand) => hand.contractScores ?? []);
          this.contractScores.set(allScores);
        },
        error: (generationError: Error) => {
          this.error.set(generationError.message || 'Failed to generate hands.');
        },
      });
  }

  protected setMode(player: Player, mode: HandMode): void {
    if (player === 'WEST') this.westMode.set(mode);
    else this.eastMode.set(mode);
  }

  protected setMinPoints(player: Player, value: string): void {
    const points = this.parseNumber(value, 0);

    if (player === 'WEST') this.westMinPoints.set(points);
    else this.eastMinPoints.set(points);
  }

  protected setMaxPoints(player: Player, value: string): void {
    const points = this.parseNumber(value, 37);

    if (player === 'WEST') this.westMaxPoints.set(points);
    else this.eastMaxPoints.set(points);
  }


  protected addRule(player: Player, groupId: number): void {
    this.updateQuery(player, (root) => updateQueryGroup(root, groupId, (group) => ({
      ...group,
      children: [...group.children, this.createNextQueryRule()],
    })));
  }

  protected addGroup(player: Player, groupId: number): void {
    this.updateQuery(player, (root) => updateQueryGroup(root, groupId, (group) => ({
      ...group,
      children: [...group.children, this.createNextDefaultQueryGroup()],
    })));
  }

  protected removeNode(player: Player, nodeId: number): void {
    this.updateQuery(player, (root) => removeQueryNode(root, nodeId));
  }

  protected setGroupOperator(player: Player, groupId: number, operator: ConditionOperator): void {
    this.updateQuery(player, (root) => setQueryGroupOperator(root, groupId, operator));
  }

  protected setRuleSuit(player: Player, ruleId: number, suit: BackendSuit): void {
    this.updateQuery(player, (root) => updateQueryRule(root, ruleId, (rule) => ({
      ...rule,
      suit,
    })));
  }

  protected setRuleMin(player: Player, ruleId: number, value: string): void {
    const min = Math.max(0, Math.min(13, this.parseNumber(value, 0)));

    this.updateQuery(player, (root) => updateQueryRule(root, ruleId, (rule) => ({
      ...rule,
      min,
    })));
  }

  protected setRuleMax(player: Player, ruleId: number, value: string): void {
    const max = Math.max(0, Math.min(13, this.parseNumber(value, 13)));

    this.updateQuery(player, (root) => updateQueryRule(root, ruleId, (rule) => ({
      ...rule,
      max,
    })));
  }

  protected handleContractSuggestionAction(index: number): void {
    const row = this.contractSuggestions()[index];

    if (!row) return;

    if (row.added) {
      this.removeContractSuggestion(index);
      return;
    }

    if (!this.isContractSuggestionComplete(row)) return;

    this.contractSuggestions.update((rows) => {
      const nextRows = rows.map((currentRow, i) =>
        i === index ? { ...currentRow, added: true } : currentRow,
      );

      const addedContractCount = nextRows.filter((currentRow) => currentRow.added).length;
      const hasDraftRow = nextRows.some((currentRow) => !currentRow.added);

      if (addedContractCount < 4 && !hasDraftRow) {
        return [...nextRows, { level: null, denomination: '', added: false }];
      }

      return nextRows;
    });
  }

  protected removeContractSuggestion(index: number): void {
    this.contractSuggestions.update((rows) => {
      const nextRows = rows.filter((_, i) => i !== index);
      const addedContractCount = nextRows.filter((row) => row.added).length;
      const hasDraftRow = nextRows.some((row) => !row.added);

      if (addedContractCount < 4 && !hasDraftRow) {
        return [...nextRows, { level: null, denomination: '', added: false }];
      }

      return nextRows.length > 0 ? nextRows : [{ level: null, denomination: '', added: false }];
    });
  }

  protected isContractSuggestionComplete(row: ContractInputRow): boolean {
    return row.level !== null && row.denomination !== '';
  }

  protected setContractLevel(index: number, value: string): void {
    const parsed = Number(value);
    const level = Number.isFinite(parsed) ? Math.max(1, Math.min(7, parsed)) : null;
    this.contractSuggestions.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, level } : row)),
    );
  }

  protected setContractDenomination(index: number, value: ContractDenomination | ''): void {
    this.contractSuggestions.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, denomination: value } : row)),
    );
  }

  protected exportWest(): void {
    if (this.results().length === 0) return;
    this.exportPlayer('WEST');
  }

  protected exportEast(): void {
    if (this.results().length === 0) return;
    this.exportPlayer('EAST');
  }

  protected exportBoth(): void {
    if (this.results().length === 0) return;
    this.isExporting.set(true);

    try {
      this.handGenerationPdfService.exportBothPdfs(this.results());
    } finally {
      this.isExporting.set(false);
    }
  }


  protected setSuitMin(player: Player, suit: SuitChar, value: string): void {
    const nextValue = this.parseNumber(value, 0);
    this.updateSuitRange(player, suit, { min: nextValue });
  }

  protected setSuitMax(player: Player, suit: SuitChar, value: string): void {
    const nextValue = this.parseNumber(value, 13);
    this.updateSuitRange(player, suit, { max: nextValue });
  }

  protected toggleSuitQualityRank(player: Player, suit: BackendSuit, rank: SuitQualityRank): void {
    const target = player === 'WEST' ? this.westSuitQualitySelections : this.eastSuitQualitySelections;

    target.update((selections) => {
      const selectedRanks = selections[suit];
      const nextSuitRanks = selectedRanks.includes(rank)
        ? selectedRanks.filter((selectedRank) => selectedRank !== rank)
        : selectedRanks.length < 3
          ? [...selectedRanks, rank]
          : selectedRanks;

      return {
        ...selections,
        [suit]: nextSuitRanks,
      };
    });
  }

  private buildPlayerConstraint(
    minPoints: number,
    maxPoints: number,
    mode: HandMode,
    suitRanges: Record<SuitChar, Range>,
    query: QueryGroup,
    suitQualitySelections: SuitQualitySelections,
  ): HandGenerationRequest['parameters'][Player] {
    const base = {
      minPoints,
      maxPoints,
    };
    const suitQualityRequirements = this.buildSuitQualityRequirements(
      mode,
      suitRanges,
      query,
      suitQualitySelections,
    );

    if (mode === 'advanced') {
      const condition = toConditionGroup(query);

      if (condition.conditions.length > 0) {
        return {
          ...base,
          condition,
          ...(Object.keys(suitQualityRequirements).length > 0 ? { suitQualityRequirements } : {}),
        };
      }
    }

    return {
      ...base,
      handDistribution: {
        suitLengths: suitRanges,
      },
      ...(Object.keys(suitQualityRequirements).length > 0 ? { suitQualityRequirements } : {}),
    };
  }

  private buildSuitQualityRequirements(
    mode: HandMode,
    suitRanges: Record<SuitChar, Range>,
    query: QueryGroup,
    suitQualitySelections: SuitQualitySelections,
  ): Partial<Record<BackendSuit, SuitQualityRequirement>> {
    return this.suitOptions.reduce<Partial<Record<BackendSuit, SuitQualityRequirement>>>((requirements, suitOption) => {
      const selectedRanks = suitQualitySelections[suitOption.value];

      if (selectedRanks.length === 0) {
        return requirements;
      }

      if (!this.isSuitAtLeastFiveCards(mode, suitOption.value, suitRanges, query)) {
        return requirements;
      }

      requirements[suitOption.value] = {
        minimumRanks: selectedRanks.slice(0, 3),
      };

      return requirements;
    }, {});
  }

  private isSuitAtLeastFiveCards(
    mode: HandMode,
    suit: BackendSuit,
    suitRanges: Record<SuitChar, Range>,
    query: QueryGroup,
  ): boolean {
    if (mode === 'basic') {
      return suitRanges[this.toSuitChar(suit)].min >= 5;
    }

    return this.queryContainsSuitWithFiveCardPotential(query, suit);
  }

  private queryContainsSuitWithFiveCardPotential(node: QueryNode, suit: BackendSuit): boolean {
    if (node.kind === 'rule') {
      return node.suit === suit && node.min >= 5;
    }

    return node.children.some((child) => this.queryContainsSuitWithFiveCardPotential(child, suit));
  }

  private toSuitChar(suit: BackendSuit): SuitChar {
    switch (suit) {
      case 'SPADES': return 'S';
      case 'HEARTS': return 'H';
      case 'DIAMONDS': return 'D';
      case 'CLUBS': return 'C';
    }
  }

  private createEmptySuitQualitySelections(): SuitQualitySelections {
    return {
      SPADES: [],
      HEARTS: [],
      DIAMONDS: [],
      CLUBS: [],
    };
  }

  private createNextDefaultQueryGroup(): QueryGroup {
    return createDefaultQueryGroup(this.nextQueryNodeId++);
  }

  private createNextQueryRule(): ReturnType<typeof createQueryRule> {
    return createQueryRule(this.nextQueryNodeId++);
  }

  private updateQuery(player: Player, update: (root: QueryGroup) => QueryGroup): void {
    if (player === 'WEST') {
      this.westQuery.update(update);
      return;
    }

    this.eastQuery.update(update);
  }




  private exportPlayer(player: Player): void {
    this.isExporting.set(true);

    try {
      this.handGenerationPdfService.exportPlayerPdf(player, this.results());
    } finally {
      this.isExporting.set(false);
    }
  }

  private updateSuitRange(player: Player, suit: SuitChar, patch: Partial<Range>): void {
    const source = player === 'WEST' ? this.westSuitRanges() : this.eastSuitRanges();
    const current = source[suit];

    const next: Record<SuitChar, Range> = {
      ...source,
      [suit]: {
        min: patch.min ?? current.min,
        max: patch.max ?? current.max,
      },
    };

    if (player === 'WEST') this.westSuitRanges.set(next);
    else this.eastSuitRanges.set(next);
  }

  private parseNumber(value: string, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private randomizeEastWestHands(hands: GeneratedHandPair[]): GeneratedHandPair[] {
    return hands.map((hand) => {
      if (Math.random() >= 0.5) {
        return hand;
      }

      return {
        ...hand,
        dealer: this.swapEastWestPlayer(hand.dealer),
        WEST: hand.EAST,
        EAST: hand.WEST,
      };
    });
  }

  private swapEastWestPlayer(player: Player): Player {
    return player === 'WEST' ? 'EAST' : 'WEST';
  }

  private startGenerationTimer(): void {
    this.stopGenerationTimer();
    this.generationStartedAtMs = Date.now();
    this.elapsedSeconds.set(0);

    this.generationTimerId = setInterval(() => {
      if (this.generationStartedAtMs === null) return;
      const elapsed = Math.floor((Date.now() - this.generationStartedAtMs) / 1000);
      this.elapsedSeconds.set(elapsed);
    }, 250);
  }

  private stopGenerationTimer(): void {
    if (this.generationTimerId !== null) {
      clearInterval(this.generationTimerId);
      this.generationTimerId = null;
    }
    this.generationStartedAtMs = null;
  }

}
