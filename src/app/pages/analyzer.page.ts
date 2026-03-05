import { Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { SingleDummyService } from '../core/services/single-dummy.service';

import type { Deal } from '../core/models/deal';
import type { Player } from '../core/models/players';
import { PLAYERS, PLAYER_LABEL } from '../core/models/players';

import type { Denomination, Level } from '../core/models/contracts';
import { DENOMINATIONS, LEVELS } from '../core/models/contracts';

import type { CardCode } from '../core/models/cards';
import type { SingleDummyAnalyzeRequest, SingleDummyAnalyzeResponse } from '../core/models/single-dummy';
import { parsePbnToDeal } from '../core/models/pbn-parser';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent, MatCardTitle} from '@angular/material/card';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';

const PARTNER: Record<Player, Player> = {
  NORTH: 'SOUTH',
  SOUTH: 'NORTH',
  EAST: 'WEST',
  WEST: 'EAST',
};

type SuitLines = { S: string; H: string; D: string; C: string };

@Component({
  selector: 'app-analyzer-page',
  standalone: true,
  templateUrl: './analyzer.page.html',
  styleUrl: './analyzer.page.scss',
  imports: [MatTooltip, MatButton, MatCard, MatCardTitle, MatCardContent, MatProgressSpinner, MatFormField, MatLabel, MatSelect, MatOption, MatHint, MatInput],
})
export class AnalyzerPage {
  private readonly singleDummyService = inject(SingleDummyService);
  private readonly document = inject(DOCUMENT);

  // --- PBN / Deal ---
  protected readonly pbnFileName = signal<string | null>(null);
  protected readonly pbnRaw = signal<string | null>(null);
  protected readonly deal = signal<Deal | null>(null);

  // --- Form selections ---
  protected readonly denominations = DENOMINATIONS;
  protected readonly levels = LEVELS;
  protected readonly players = PLAYERS;
  protected readonly playerLabel = PLAYER_LABEL;

  protected readonly denomination = signal<Denomination>('SPADES');
  protected readonly level = signal<Level>(4);
  protected readonly declarer = signal<Player>('SOUTH');
  protected readonly dummyPlayer = computed<Player>(() => PARTNER[this.declarer()]);
  protected readonly dummyLabel = computed(() => this.playerLabel[this.dummyPlayer()]);
  protected readonly samples = signal<number>(500);

  // --- Request/Response state ---
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly request = signal<SingleDummyAnalyzeRequest | null>(null);
  protected readonly response = signal<SingleDummyAnalyzeResponse | null>(null);

  protected readonly requestJson = computed(() =>
    this.request() ? JSON.stringify(this.request(), null, 2) : '',
  );

  protected readonly responseJson = computed(() =>
    this.response() ? JSON.stringify(this.response(), null, 2) : '',
  );

  protected readonly dealReady = computed(() => !!this.deal());

  protected readonly northHand = computed(() => this.handToSuitLines('NORTH'));
  protected readonly eastHand = computed(() => this.handToSuitLines('EAST'));
  protected readonly southHand = computed(() => this.handToSuitLines('SOUTH'));
  protected readonly westHand = computed(() => this.handToSuitLines('WEST'));

  protected readonly confidence95Text = computed(() => {
    const r = this.response();
    if (!r) return '';
    return `${this.formatDecimal(r.confidence95.low)}–${this.formatDecimal(r.confidence95.high)}`;
  });

  protected readonly histogramRows = computed(() => {
    const r = this.response();
    if (!r) return [] as Array<{ tricks: number; count: number; pct: number }>;

    const total = r.samples || 0;

    return Object.entries(r.tricksHistogram ?? {})
      .map(([tricks, count]) => ({
        tricks: Number(tricks),
        count: Number(count),
        pct: total > 0 ? Number(count) / total : 0,
      }))
      .filter((x) => Number.isFinite(x.tricks) && Number.isFinite(x.count))
      .sort((a, b) => a.tricks - b.tricks);
  });

  protected readonly successProbabilityPct = computed(() => {
    const r = this.response();
    if (!r) return '';
    return `${this.formatPercent(r.successProbability)}`;
  });

  private formatDecimal(n: number, digits = 2): string {
    if (!Number.isFinite(n)) return '-';
    return n.toFixed(digits);
  }

  private formatPercent(p: number, digits = 1): string {
    if (!Number.isFinite(p)) return '-';
    return `${(p * 100).toFixed(digits)}%`;
  }

  protected onPbnFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.resetAnalysisState();

    this.pbnFileName.set(file.name);

    const reader = new FileReader();
    reader.onerror = () => this.error.set('Failed to read file.');
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        this.pbnRaw.set(text);

        const parsedDeal = parsePbnToDeal(text);
        this.deal.set(parsedDeal);

        // Sensible defaults once we have a deal:
        this.declarer.set('SOUTH');
        this.denomination.set('SPADES');
        this.level.set(4);
        this.samples.set(500);

        this.error.set(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to parse PBN.';
        this.error.set(msg);
        this.deal.set(null);
      }
    };

    reader.readAsText(file);
  }

  protected setDeclarerFromSelect(value: string): void {
    if (!PLAYERS.includes(value as Player)) {
      this.error.set(`Invalid declarer "${value}". Must be one of ${PLAYERS.join(', ')}.`);
      return;
    }
    this.declarer.set(value as Player);
  }

  protected setDenominationFromSelect(value: string): void {
    if (!DENOMINATIONS.includes(value as Denomination)) {
      this.error.set(`Invalid strain "${value}". Must be one of ${DENOMINATIONS.join(', ')}.`);
      return;
    }
    this.denomination.set(value as Denomination);
  }

  protected setSamplesFromInput(value: string): void {
    const n = Number(value);

    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      this.error.set('Samples must be an integer.');
      return;
    }
    if (n <= 0) {
      this.error.set('Samples must be a positive number.');
      return;
    }
    if (n > 2000) {
      this.error.set('Samples must be 2000 or less.');
      this.samples.set(2000);
      return;
    }
    if (this.error()?.startsWith('Samples')) {
      this.error.set(null);
    }

    this.samples.set(n);
  }

  protected setLevelFromSelect(value: string): void {
    const n = Number(value);
    if (!LEVELS.includes(n as Level)) {
      this.error.set(`Invalid level "${value}". Must be 1..7.`);
      return;
    }
    this.level.set(n as Level);
  }

  protected runSingleDummy(): void {
    this.error.set(null);
    this.response.set(null);

    const deal = this.deal();
    if (!deal) {
      this.error.set('Please upload a PBN file first.');
      return;
    }

    const samples = Number(this.samples());
    if (!Number.isFinite(samples) || samples <= 0) {
      this.error.set('Samples must be a positive number.');
      return;
    }

    const declarer = this.declarer();
    const dummy = this.dummyPlayer();

    const handsForRequest: Partial<Record<Player, CardCode[]>> = {
      NORTH: deal.hands.NORTH,
      EAST: deal.hands.EAST,
      SOUTH: deal.hands.SOUTH,
      WEST: deal.hands.WEST,
    };

    const request: SingleDummyAnalyzeRequest = {
      declarer,
      dummy,
      contract: {
        level: this.level(),
        denomination: this.denomination(),
      },
      hands: handsForRequest,
      samples,
    };

    this.request.set(request);
    this.loading.set(true);

    this.singleDummyService.singleDummyAnalyze(request).subscribe({
      next: (resp) => {
        this.response.set(resp);
        this.loading.set(false);
        setTimeout(() => this.scrollToResults(), 0);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Request failed.';
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }

  private resetAnalysisState(): void {
    this.error.set(null);
    this.request.set(null);
    this.response.set(null);
    this.loading.set(false);
  }

  private scrollToResults(): void {
    const el = this.document.getElementById('results');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private handToSuitLines(player: Player): SuitLines {
    const deal = this.deal();
    if (!deal) return { S: '-', H: '-', D: '-', C: '-' };

    const cards = deal.hands[player] ?? [];
    const bySuit: Record<'S' | 'H' | 'D' | 'C', string[]> = { S: [], H: [], D: [], C: [] };

    for (const c of cards) {
      const suit = c[0] as 'S' | 'H' | 'D' | 'C';
      const rank = c[1];
      bySuit[suit].push(rank);
    }

    const rankOrder = 'AKQJT98765432';
    const sortRanks = (ranks: string[]) =>
      [...ranks].sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b)).join('');

    return {
      S: sortRanks(bySuit.S) || '-',
      H: sortRanks(bySuit.H) || '-',
      D: sortRanks(bySuit.D) || '-',
      C: sortRanks(bySuit.C) || '-',
    };
  }
}
