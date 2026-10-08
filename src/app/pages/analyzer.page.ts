import {Component, computed, DOCUMENT, inject, signal} from '@angular/core';
import {MatTooltip} from '@angular/material/tooltip';
import {SingleDummyService} from '../core/services/single-dummy.service';

import type {Deal} from '../core/models/deal';
import type {Player} from '../core/models/players';
import {PLAYER_LABEL, PLAYERS} from '../core/models/players';

import type {Denomination, Level} from '../core/models/contracts';
import {DENOMINATIONS, LEVELS} from '../core/models/contracts';

import type {CardCode} from '../core/models/cards';
import type {SingleDummyAnalyzeRequest, SingleDummyAnalyzeResponse} from '../core/models/single-dummy';
import {parsePbnToDeals} from '../core/models/pbn-parser';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {MatDialog} from '@angular/material/dialog';
import {MatRadioButton} from '@angular/material/radio';
import {HandPickerDialog} from '../core/components/hand-picker-dialog';
import {PercentValuePipe} from '../core/pipes/percent-value.pipe';
import {ConfidenceIntervalPipe} from '../core/pipes/confidence-interval.pipe';
import {buildHistogramRows} from '../core/utils/build-histogram-rows';
import {DealDisplayComponent} from '../core/components/deal-display';
import {MatCheckbox} from '@angular/material/checkbox';
import {HandConstraintEditorComponent} from '../hand-generation/components/hand-constraint-editor/hand-constraint-editor';
import {
  buildHandConstraint,
  createHandConstraintState,
  EVALUATOR_OPTIONS,
  type HandConstraintState,
} from '../hand-generation/utils/hand-constraint-state';
import type {HandConstraint, HandEvaluator} from '../hand-generation/models/hand-generation-api.models';

const PARTNER: Record<Player, Player> = {
  NORTH: 'SOUTH',
  SOUTH: 'NORTH',
  EAST: 'WEST',
  WEST: 'EAST',
};

type DealSource = 'PBN' | 'MANUAL_NS';

@Component({
  selector: 'app-analyzer-page',
  standalone: true,
  templateUrl: './analyzer.page.html',
  styleUrl: './analyzer.page.scss',
  imports: [MatTooltip, MatButton, MatCard, MatCardTitle, MatCardContent, MatProgressSpinner, MatFormField, MatLabel, MatSelect, MatOption, MatHint, MatInput, MatCardHeader, PercentValuePipe, ConfidenceIntervalPipe, DealDisplayComponent, MatRadioButton, MatCheckbox, HandConstraintEditorComponent],
})
export class AnalyzerPage {
  private readonly singleDummyService = inject(SingleDummyService);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = inject(MatDialog);

  // --- PBN / Deal ---
  protected readonly pbnFileName = signal<string | null>(null);
  protected readonly pbnRaw = signal<string | null>(null);
  protected readonly deals = signal<Deal[]>([]);
  protected readonly selectedDealIndex = signal(0);
  protected readonly deal = computed(() => this.deals()[this.selectedDealIndex()] ?? null);
  protected readonly multipleDeals = computed(() => this.deals().length > 1);
  protected readonly selectedDealLabel = computed(() => {
    const deal = this.deal();
    if (!deal) return null;

    return deal.board ? `Board ${deal.board}` : `Deal ${this.selectedDealIndex() + 1}`;
  });
  protected readonly dealSource = signal<DealSource | null>(null);

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

  // --- Optional hand constraints (dummy and defenders) ---
  protected readonly evaluatorOptions = EVALUATOR_OPTIONS;
  protected readonly evaluator = signal<HandEvaluator>('standard');
  protected readonly constraintEnabled = signal<Record<Player, boolean>>(createConstraintFlags());
  protected readonly constraintStates = signal<Record<Player, HandConstraintState>>(createConstraintStates());

  protected readonly defenders = computed<Player[]>(() =>
    PLAYERS.filter((p) => p !== this.declarer() && p !== this.dummyPlayer()),
  );
  /** Seats that may be constrained: the dummy first, then the defenders. */
  protected readonly constrainablePlayers = computed<Player[]>(() => [this.dummyPlayer(), ...this.defenders()]);
  protected readonly dummyHasCards = computed(() => hasFullHand(this.deal(), this.dummyPlayer()));
  protected readonly constrainedPlayers = computed<Player[]>(() =>
    this.constrainablePlayers().filter((p) => this.isConstrained(p)),
  );
  protected readonly hasConstraints = computed(() => this.constrainedPlayers().length > 0);

  // --- Request/Response state ---
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly request = signal<SingleDummyAnalyzeRequest | null>(null);
  protected readonly response = signal<SingleDummyAnalyzeResponse | null>(null);

  protected readonly dealReady = computed(() => !!this.deal());
  protected readonly sampleShortfall = computed(() => {
    const req = this.request();
    const resp = this.response();
    return req && resp && resp.samples < req.samples ? { requested: req.samples, found: resp.samples } : null;
  });
  protected readonly isManualNsMode = computed(() => this.dealSource() === 'MANUAL_NS');
  protected readonly showEastWest = computed(() => !this.isManualNsMode());

  protected readonly histogramRows = computed(() => buildHistogramRows(this.response()));

  protected readonly dealDisplayItems = computed(() =>
    this.deals().map((deal, index) => {
      const boardLabel = deal.board ? `Board ${deal.board}` : `Deal ${index + 1}`;

      return {
        deal,
        index,
        title: this.deals().length > 1 ? `${boardLabel} (N/E/S/W)` : undefined,
      };
    }),
  );

  protected selectDealForAnalysis(index: number): void {
    if (index === this.selectedDealIndex()) return;

    this.selectedDealIndex.set(index);
    this.response.set(null);
    this.request.set(null);
    this.error.set(null);
  }

  protected openHandPickerDialog(): void {
    const ref = this.dialog.open(HandPickerDialog, {
      width: '1100px',
      maxWidth: '96vw',
      maxHeight: '85vh',
    });

    ref.afterClosed().subscribe((result?: { north: CardCode[]; south: CardCode[] }) => {
      if (!result) return;

      this.applyDeals(
        [
          {
            first: 'NORTH',
            hands: {
              NORTH: result.north,
              SOUTH: result.south,
            },
          },
        ],
        'MANUAL_NS',
      );

      this.pbnFileName.set(null);
      this.pbnRaw.set(null);
    });
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

        this.applyDeals(parsePbnToDeals(text), 'PBN');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to parse PBN.';
        this.error.set(msg);
        this.deals.set([]);
        this.selectedDealIndex.set(0);
        this.dealSource.set(null);
      }
    };

    reader.readAsText(file);
  }

  /** The dummy is always constrained when its cards are unknown. */
  protected isConstrained(player: Player): boolean {
    if (player === this.declarer()) return false;
    if (player === this.dummyPlayer() && !this.dummyHasCards()) return true;
    return this.constraintEnabled()[player];
  }

  protected isConstraintToggleDisabled(player: Player): boolean {
    return player === this.dummyPlayer() && !this.dummyHasCards();
  }

  protected constraintToggleLabel(player: Player): string {
    const name = this.playerLabel[player];
    if (player !== this.dummyPlayer()) return `Constrain ${name}`;
    return this.dummyHasCards()
      ? `Constrain ${name} (dummy) instead of using its cards`
      : `Constrain ${name} (dummy) — no cards were picked`;
  }

  protected setConstraintEnabled(player: Player, enabled: boolean): void {
    this.constraintEnabled.update((flags) => ({ ...flags, [player]: enabled }));
  }

  protected setConstraintState(player: Player, state: HandConstraintState): void {
    this.constraintStates.update((states) => ({ ...states, [player]: state }));
  }

  protected setEvaluatorFromSelect(value: string): void {
    const option = EVALUATOR_OPTIONS.find((o) => o.value === value);
    if (!option) {
      this.error.set(`Invalid evaluator "${value}".`);
      return;
    }
    this.evaluator.set(option.value);
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

    if (!hasFullHand(deal, this.declarer())) {
      this.error.set(`Declarer ${this.playerLabel[this.declarer()]} has no cards. Choose a declarer whose hand is known.`);
      return;
    }

    const request = this.buildAnalyzeRequest(deal, samples);

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

  private applyDeals(deals: Deal[], source: DealSource): void {
    this.resetAnalysisState();
    this.deals.set(deals);
    this.selectedDealIndex.set(0);
    this.dealSource.set(source);
    this.resetDefaultsForNewDeal();
    this.error.set(null);
  }

  private resetDefaultsForNewDeal(): void {
    this.declarer.set('SOUTH');
    this.denomination.set('SPADES');
    this.level.set(4);
    this.samples.set(500);
    this.constraintEnabled.set(createConstraintFlags());
  }

  private buildAnalyzeRequest(deal: Deal, samples: number): SingleDummyAnalyzeRequest {
    const dummy = this.dummyPlayer();
    const constrained = this.constrainedPlayers();

    const hands = this.isManualNsMode()
      ? {
        NORTH: deal.hands.NORTH,
        SOUTH: deal.hands.SOUTH,
      }
      : {
        NORTH: deal.hands.NORTH,
        EAST: deal.hands.EAST,
        SOUTH: deal.hands.SOUTH,
        WEST: deal.hands.WEST,
      };

    const request: SingleDummyAnalyzeRequest = {
      declarer: this.declarer(),
      dummy,
      contract: {
        level: this.level(),
        denomination: this.denomination(),
      },
      // a constrained dummy must not also be sent as known cards
      hands: constrained.includes(dummy) ? { ...hands, [dummy]: undefined } : hands,
      samples,
    };

    if (constrained.length > 0) {
      const constraints: Partial<Record<Player, HandConstraint>> = {};
      for (const player of constrained) {
        constraints[player] = buildHandConstraint(this.constraintStates()[player]);
      }
      request.constraints = constraints;
      request.evaluator = this.evaluator();
    }

    return request;
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

}

function hasFullHand(deal: Deal | null, player: Player): boolean {
  return (deal?.hands[player]?.length ?? 0) === 13;
}

function createConstraintFlags(): Record<Player, boolean> {
  return { NORTH: false, EAST: false, SOUTH: false, WEST: false };
}

function createConstraintStates(): Record<Player, HandConstraintState> {
  return {
    NORTH: createHandConstraintState(),
    EAST: createHandConstraintState(),
    SOUTH: createHandConstraintState(),
    WEST: createHandConstraintState(),
  };
}
