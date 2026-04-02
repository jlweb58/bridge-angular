import {Component, computed, effect, inject, input, signal} from '@angular/core';

import type { Deal } from '../models/deal';
import { cardsToSuitLines } from '../utils/cards-to-suit-lines';
import {HandEvaluationService} from '../services/hand-evaluation.service';
import {catchError, firstValueFrom, forkJoin, of} from 'rxjs';
import {Player} from '../models/players';
import {CardCode} from '../models/cards';

type HandValuesByPlayer = Partial<Record<Player, number | null>>;

@Component({
  selector: 'app-deal-display',
  standalone: true,
  templateUrl: './deal-display.html',
  styleUrl: './deal-display.scss',
})
export class DealDisplayComponent {
  readonly deal = input.required<Deal>();
  readonly showEastWest = input(true);

  private readonly handEvaluationService = inject(HandEvaluationService);

  protected readonly handValues = signal<HandValuesByPlayer>({});

  protected readonly title = computed(() =>
    this.showEastWest() ? '2) Deal (N/E/S/W)' : '2) Deal (North / South)',
  );

  protected readonly northHand = computed(() => cardsToSuitLines(this.deal().hands.NORTH));
  protected readonly eastHand = computed(() => cardsToSuitLines(this.deal().hands.EAST));
  protected readonly southHand = computed(() => cardsToSuitLines(this.deal().hands.SOUTH));
  protected readonly westHand = computed(() => cardsToSuitLines(this.deal().hands.WEST));

  constructor() {
    effect(() => {
      void this.refreshHandValues(this.deal());
    });
  }

  protected handValueLabel(player: Player): string {
    const value = this.handValues()[player];
    return Number.isFinite(value) ? ` (${value!.toFixed(1)})` : '';
  }

  private async refreshHandValues(deal: Deal): Promise<void> {
    const entries = (Object.entries(deal.hands) as Array<[Player, CardCode[] | undefined]>)
      .filter(([, cards]) => Array.isArray(cards) && cards.length > 0);

    if (entries.length === 0) {
      this.handValues.set({});
      return;
    }

    const calls = entries.map(([_, cards]) =>
      this.handEvaluationService.evaluateHand(cards!).pipe(
        catchError(() => of(null)),
      ),
    );

    const values = await firstValueFrom(forkJoin(calls));

    const nextValues: HandValuesByPlayer = {};
    entries.forEach(([player], index) => {
      nextValues[player] = values[index];
    });

    this.handValues.set(nextValues);
  }

}
