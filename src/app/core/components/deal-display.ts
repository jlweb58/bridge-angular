import { Component, computed, input } from '@angular/core';

import type { Deal } from '../models/deal';
import { cardsToSuitLines } from '../utils/cards-to-suit-lines';

@Component({
  selector: 'app-deal-display',
  standalone: true,
  templateUrl: './deal-display.html',
  styleUrl: './deal-display.scss',
})
export class DealDisplayComponent {
  readonly deal = input.required<Deal>();
  readonly showEastWest = input(true);

  protected readonly title = computed(() =>
    this.showEastWest() ? '2) Deal (N/E/S/W)' : '2) Deal (North / South)',
  );

  protected readonly northHand = computed(() => cardsToSuitLines(this.deal().hands.NORTH));
  protected readonly eastHand = computed(() => cardsToSuitLines(this.deal().hands.EAST));
  protected readonly southHand = computed(() => cardsToSuitLines(this.deal().hands.SOUTH));
  protected readonly westHand = computed(() => cardsToSuitLines(this.deal().hands.WEST));
}
