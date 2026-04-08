import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { type SuitChar } from '../models/cards';
import {
  HandGenerationService,
  type HandGenerationRequest,
  type GeneratedHandPair,
  HandEvaluator
} from '../services/hand-generation.service';
import { GeneratedHandsViewComponent } from './generated-hands-view';
import {HandGenerationPdfService} from '../services/hand-generation-pdf.service';

type Player = 'WEST' | 'EAST';

interface Range {
  min: number;
  max: number;
}

interface EvaluatorOption {
  label: string;
  value: HandEvaluator;
}

@Component({
  selector: 'app-hand-generation',
  standalone: true,
  imports: [CommonModule, FormsModule, GeneratedHandsViewComponent],
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

  protected readonly numberOfHands = signal(10);
  protected readonly evaluatorOptions: EvaluatorOption[] = [
    { label: 'Standard', value: 'standard' },
    { label: 'Kaplan-Rubens', value: 'kaplan-rubens' },
    { label: 'Bergen', value: 'bergen' },
  ];  protected readonly selectedEvaluator = signal<HandEvaluator>('standard');

  protected readonly westMinPoints = signal(15);
  protected readonly westMaxPoints = signal(17);
  protected readonly eastMinPoints = signal(0);
  protected readonly eastMaxPoints = signal(37);

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

    this.isLoading.set(true);
    this.error.set(null);

    this.handGenerationService
      .generateHands(request)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.results.set(response.hands ?? []);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : 'Failed to generate hands.');
          this.results.set([]);
        },
      });
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
}
