import { Component, computed, inject, signal } from '@angular/core';
import { SingleDummyService } from './core/services/single-dummy.service';

import type { Deal } from './core/models/deal';
import type { Player } from './core/models/players';
import { PLAYERS, PLAYER_LABEL } from './core/models/players';

import type { Denomination, Level } from './core/models/contracts';
import { DENOMINATIONS, LEVELS } from './core/models/contracts';

import type { CardCode } from './core/models/cards';
import type { SingleDummyAnalyzeRequest, SingleDummyAnalyzeResponse } from './core/models/single-dummy';
import { parsePbnToDeal } from './core/models/pbn-parser';

const PARTNER: Record<Player, Player> = {
  NORTH: 'SOUTH',
  SOUTH: 'NORTH',
  EAST: 'WEST',
  WEST: 'EAST',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly singleDummyService = inject(SingleDummyService);

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
  protected readonly dummy = computed<Player>(() => PARTNER[this.declarer()]);
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

  protected readonly northHandText = computed(() => this.handToPrettyText('NORTH'));
  protected readonly eastHandText = computed(() => this.handToPrettyText('EAST'));
  protected readonly southHandText = computed(() => this.handToPrettyText('SOUTH'));
  protected readonly westHandText = computed(() => this.handToPrettyText('WEST'));

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
    const dummy = PARTNER[declarer];

    const handsForRequest: Partial<Record<Player, CardCode[]>> = {
      // include all four hands (works even if server only uses declarer/dummy)
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
      seed: 12345,
    };

    this.request.set(request);
    this.loading.set(true);

    this.singleDummyService.singleDummyAnalyze(request).subscribe({
      next: (resp) => {
        this.response.set(resp);
        this.loading.set(false);
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

  private handToPrettyText(player: Player): string {
    const deal = this.deal();
    if (!deal) return '';

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

    const s = sortRanks(bySuit.S) || '-';
    const h = sortRanks(bySuit.H) || '-';
    const d = sortRanks(bySuit.D) || '-';
    const c = sortRanks(bySuit.C) || '-';

    return `S: ${s}\nH: ${h}\nD: ${d}\nC: ${c}`;
  }

  protected readonly Number = Number;
}
