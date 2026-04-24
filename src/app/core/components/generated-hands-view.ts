import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

import type { CardCode, SuitChar } from '../models/cards';
import type {ContractDenomination, ContractScore, GeneratedHandPair} from '../services/hand-generation.service';

@Component({
  selector: 'app-generated-hands-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generated-hands-view.html',
  styleUrl: './generated-hands-view.scss',
})
export class GeneratedHandsViewComponent {
  readonly hands = input<GeneratedHandPair[]>([]);

  protected readonly suitChars: SuitChar[] = ['S', 'H', 'D', 'C'];
  protected readonly rankOrder = 'AKQJT98765432';

  protected trackByIndex(index: number): number {
    return index;
  }

  protected suitSymbol(suit: SuitChar): string {
    switch (suit) {
      case 'S': return '♠';
      case 'H': return '♥';
      case 'D': return '♦';
      case 'C': return '♣';
    }
  }

  protected cardsForSuit(cards: CardCode[], suit: SuitChar): CardCode[] {
    return cards
      .filter((card) => card[0] === suit)
      .sort((a, b) => this.rankOrder.indexOf(a[1]) - this.rankOrder.indexOf(b[1]));

  }

  protected suitRanks(cards: CardCode[], suit: SuitChar): string {
    return this.cardsForSuit(cards, suit)
      .map((card) => card[1])
      .join('') || '—';
  }

  protected contractDenominationLabel(denomination: ContractDenomination): string {
    switch (denomination) {
      case 'SPADES': return '♠';
      case 'HEARTS': return '♥';
      case 'DIAMONDS': return '♦';
      case 'CLUBS': return '♣';
      case 'NOTRUMP': return 'NT';
    }
  }

  protected isRedDenomination(denomination: ContractDenomination): boolean {
    return denomination === 'HEARTS' || denomination === 'DIAMONDS';
  }

}
