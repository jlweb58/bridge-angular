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
  type HandGenerationRequest, NorthDescription,
  type Range,
  type SuitQualityRank,
} from '../models/hand-generation-api.models';
import {
  type ConditionOperator,
  type ContractInputRow,
  type EvaluatorOption,
  type HandMode,
  type QueryGroup,
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
import {
  buildHandConstraint,
  createEmptySuitQualitySelections,
  EVALUATOR_OPTIONS,
  SUIT_OPTIONS,
  SUIT_QUALITY_RANK_OPTIONS,
} from '../utils/hand-constraint-state';
import { GeneratedHandsViewComponent } from './generated-hands-view';
import { PlayerHandParametersComponent } from './player-hand-parameters/player-hand-parameters';
import { Player } from '../../core/models/players';
import { handPairToPbn } from '../../core/models/pbn-builder';
import { normalizeGeneratedHand } from '../utils/normalize-generated-hand';

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
  private exportBatchId = this.createBatchId();

  protected readonly numberOfHands = signal(10);
  protected readonly evaluatorOptions: EvaluatorOption[] = EVALUATOR_OPTIONS;
  protected readonly selectedEvaluator = signal<HandEvaluator>('standard');
  protected readonly randomizeHands = signal(false);

  protected readonly denominationOptions: ContractDenomination[] = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES', 'NOTRUMP'];
  protected readonly contractSuggestions = signal<ContractInputRow[]>([{ level: null, denomination: '', added: false }]);

  protected readonly westMinPoints = signal(15);
  protected readonly westMaxPoints = signal(17);
  protected readonly eastMinPoints = signal(8);
  protected readonly eastMaxPoints = signal(12);
  protected readonly northMinPoints = signal(5);
  protected readonly northMaxPoints = signal(8);

  protected readonly westMode = signal<HandMode>('basic');
  protected readonly eastMode = signal<HandMode>('basic');
  protected readonly northMode = signal<HandMode>('basic');
  protected readonly includeNorthHand = signal(false);
  protected readonly northShortDescription = signal('');

  protected readonly suitOptions: SuitOption[] = SUIT_OPTIONS;

  protected readonly suitQualityRankOptions: SuitQualityRankOption[] = SUIT_QUALITY_RANK_OPTIONS;

  protected readonly westQuery = signal<QueryGroup>(this.createNextDefaultQueryGroup());
  protected readonly eastQuery = signal<QueryGroup>(this.createNextDefaultQueryGroup());
  protected readonly northQuery = signal<QueryGroup>(this.createNextDefaultQueryGroup());

  protected readonly westSuitQualitySelections = signal<SuitQualitySelections>(createEmptySuitQualitySelections());
  protected readonly eastSuitQualitySelections = signal<SuitQualitySelections>(createEmptySuitQualitySelections());
  protected readonly northSuitQualitySelections = signal<SuitQualitySelections>(createEmptySuitQualitySelections());

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

  protected readonly northSuitRanges = signal<Record<SuitChar, Range>>({
    S: { min: 6, max: 6 },
    H: { min: 0, max: 3 },
    D: { min: 0, max: 4 },
    C: { min: 0, max: 4 },
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

    if (this.includeNorthHand()) {
      request.parameters.NORTH = this.buildPlayerConstraint(
        this.northMinPoints(),
        this.northMaxPoints(),
        this.northMode(),
        this.northSuitRanges(),
        this.northQuery(),
        this.northSuitQualitySelections(),
      );

      request.northDescription = this.buildNorthDescription();
    }

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
    this.exportBatchId = this.createBatchId();
    this.startGenerationTimer();

    this.handGenerationService
      .generateHands(request)
      .pipe(finalize(() => {
        this.isLoading.set(false);
        this.stopGenerationTimer();
      }))
      .subscribe({
        next: (response) => {
          const normalizedHands = (response.hands ?? []).map(normalizeGeneratedHand);
          const responseNorthDescription = response.northDescription;

          const handsWithNorthDescription = responseNorthDescription
            ? normalizedHands.map((hand) => ({
              ...hand,
              northDescription: hand.northDescription ?? responseNorthDescription,
            }))
            : normalizedHands;

          const hands = this.randomizeHands()
            ? this.randomizeEastWestHands(handsWithNorthDescription)
            : handsWithNorthDescription;

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
    else if (player === 'EAST') this.eastMode.set(mode);
    else if (player === 'NORTH') this.northMode.set(mode);
  }

  protected setMinPoints(player: Player, value: string): void {
    const points = this.parseNumber(value, 0);

    if (player === 'WEST') this.westMinPoints.set(points);
    else if (player === 'EAST') this.eastMinPoints.set(points);
    else if (player === 'NORTH') this.northMinPoints.set(points);
  }

  protected setMaxPoints(player: Player, value: string): void {
    const points = this.parseNumber(value, 37);

    if (player === 'WEST') this.westMaxPoints.set(points);
    else if (player === 'EAST') this.eastMaxPoints.set(points);
    else if (player === 'NORTH') this.northMaxPoints.set(points);
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
      this.handGenerationPdfService.exportBothPdfs(this.results(), this.exportBatchId);
    } finally {
      this.isExporting.set(false);
    }
  }

  protected exportPbn(): void {
    const hands = this.results();

    if (hands.length === 0) return;

    this.isExporting.set(true);
    this.error.set(null);

    try {
      const pbn = hands
        .map((hand, index) => handPairToPbn({
          ...hand,
          board: index + 1,
        }))
        .join('\n');

      const blob = new Blob([pbn], { type: 'application/x-pbn;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = `generated-hand-${this.exportBatchId}.pbn`;
      anchor.click();

      URL.revokeObjectURL(url);
    } catch (exportError) {
      this.error.set(exportError instanceof Error ? exportError.message : 'Failed to export PBN.');
    } finally {
      this.isExporting.set(false);
    }  }

  protected setSuitMin(player: Player, suit: SuitChar, value: string): void {
    const nextValue = this.parseNumber(value, 0);
    this.updateSuitRange(player, suit, { min: nextValue });
  }

  protected setSuitMax(player: Player, suit: SuitChar, value: string): void {
    const nextValue = this.parseNumber(value, 13);
    this.updateSuitRange(player, suit, { max: nextValue });
  }

  protected toggleSuitQualityRank(player: Player, suit: BackendSuit, rank: SuitQualityRank): void {
    const target = player === 'WEST'
      ? this.westSuitQualitySelections
      : player === 'EAST'
        ? this.eastSuitQualitySelections
        : this.northSuitQualitySelections;

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
    return buildHandConstraint({ minPoints, maxPoints, mode, suitRanges, query, suitQualitySelections });
  }

  private buildNorthDescription(): NorthDescription {
    const shortText = this.northShortDescription().trim();
    const condition = this.northMode() === 'basic'
      ? this.describeBasicNorthCondition()
      : this.describeAdvancedNorthCondition();

    return {
      ...(shortText ? { shortText: shortText } : {}),
      overview: shortText
        ? `North condition: ${condition}; ${shortText}`
        : `North condition: ${condition}`,
    };
  }

  private describeBasicNorthCondition(): string {
    const suitParts = this.suitChars
      .map((suit) => this.describeSuitRange(suit, this.northSuitRanges()[suit]))
      .filter((description): description is string => description !== null);

    return [
      `${this.describeRange(this.northMinPoints(), this.northMaxPoints())} HCP`,
      ...suitParts,
    ].join(', ');
  }

  private describeAdvancedNorthCondition(): string {
    return `${this.describeRange(this.northMinPoints(), this.northMaxPoints())} HCP, advanced suit conditions`;
  }

  private describeSuitRange(suit: SuitChar, range: Range): string | null {
    if (range.min === 0 && range.max === 13) {
      return null;
    }

    return `${this.describeRange(range.min, range.max)} ${this.suitSymbol(suit)}`;
  }

  private describeRange(min: number, max: number): string {
    if (min === max) {
      return `${min}`;
    }

    if (max >= 13) {
      return `${min}+`;
    }

    return `${min}-${max}`;
  }

  private suitSymbol(suit: SuitChar): string {
    switch (suit) {
      case 'S': return 'spades';
      case 'H': return 'hearts';
      case 'D': return 'diamonds';
      case 'C': return 'clubs';
    }
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

    if (player === 'EAST') {
      this.eastQuery.update(update);
      return;
    }

    if (player === 'NORTH') {
      this.northQuery.update(update);
    }
  }

  private exportPlayer(player: Player): void {
    this.isExporting.set(true);

    try {
      this.handGenerationPdfService.exportPlayerPdf(player, this.results(), {
        batchId: this.exportBatchId,
      });
    } finally {
      this.isExporting.set(false);
    }
  }

  private updateSuitRange(player: Player, suit: SuitChar, patch: Partial<Range>): void {
    const source = player === 'WEST'
      ? this.westSuitRanges()
      : player === 'EAST'
        ? this.eastSuitRanges()
        : this.northSuitRanges();    const current = source[suit];

    const next: Record<SuitChar, Range> = {
      ...source,
      [suit]: {
        min: patch.min ?? current.min,
        max: patch.max ?? current.max,
      },
    };

    if (player === 'WEST') this.westSuitRanges.set(next);
    else if (player === 'EAST') this.eastSuitRanges.set(next);
    else if (player === 'NORTH') this.northSuitRanges.set(next);
  }

  private parseNumber(value: string, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private createBatchId(): string {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  private randomizeEastWestHands(hands: GeneratedHandPair[]): GeneratedHandPair[] {
    return hands.map((hand) => {
      if (Math.random() >= 0.5) {
        return hand;
      }

      return {
        ...hand,
        dealer: hand.dealer,
        hands: {
          ...hand.hands,
          WEST: hand.hands.EAST,
          EAST: hand.hands.WEST,
        },
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
