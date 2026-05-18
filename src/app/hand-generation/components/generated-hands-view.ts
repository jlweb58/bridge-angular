import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

import { ranksForSuit, type CardCode, SUIT_CHARS, type SuitChar } from '../../core/models/cards';
import type { ContractDenomination, GeneratedHandPair } from '../models/hand-generation-api.models';

@Component({
  selector: 'app-generated-hands-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generated-hands-view.html',
  styleUrl: './generated-hands-view.scss',
})
export class GeneratedHandsViewComponent {
  readonly hands = input<GeneratedHandPair[]>([]);

  protected readonly suitChars = SUIT_CHARS;

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

  protected suitRanks(cards: CardCode[] | undefined, suit: SuitChar): string {
    return ranksForSuit(cards, suit, '—');
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
