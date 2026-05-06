import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { type SuitChar } from '../models/cards';
import {
  HandGenerationService,
  type HandGenerationRequest,
  type GeneratedHandPair,
  type ContractScore,
  type ContractDenomination,
  type Range,
  type Player,
  HandEvaluator
} from '../services/hand-generation.service';
import { GeneratedHandsViewComponent } from './generated-hands-view';
import {HandGenerationPdfService} from '../services/hand-generation-pdf.service';
import {MatTooltip} from '@angular/material/tooltip';

interface EvaluatorOption {
  label: string;
  value: HandEvaluator;
}

interface ContractInputRow {
  level: number | null;
  denomination: ContractDenomination | '';
  added: boolean;
}

@Component({
  selector: 'app-hand-generation',
  standalone: true,
  imports: [CommonModule, FormsModule, GeneratedHandsViewComponent, MatTooltip],
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
        WEST: {
          minPoints: this.westMinPoints(),
          maxPoints: this.westMaxPoints(),
          handDistribution: {
            suitLengths: this.westSuitRanges(),
          },
        },
        EAST: {
          minPoints: this.eastMinPoints(),
          maxPoints: this.eastMaxPoints(),
          handDistribution: {
            suitLengths: this.eastSuitRanges(),
          },
        },
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
      });
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
