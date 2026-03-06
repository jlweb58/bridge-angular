import { Component, computed, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';

import { type CardCode, SUIT_CHARS, type SuitChar, RANK_CHARS } from '../models/cards';

type PickerSeat = 'NORTH' | 'SOUTH';

@Component({
  selector: 'app-hand-picker-dialog',
  standalone: true,
  templateUrl: './hand-picker-dialog.html',
  styleUrl: './hand-picker-dialog.scss',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
  ],
})
export class HandPickerDialog {

  protected readonly activeSeat = signal<PickerSeat>('NORTH');
  protected readonly north = signal<CardCode[]>([]);
  protected readonly south = signal<CardCode[]>([]);

  protected readonly suits = SUIT_CHARS;
  protected readonly ranksDesc = [...RANK_CHARS].reverse();

  protected readonly northCount = computed(() => this.north().length);
  protected readonly southCount = computed(() => this.south().length);

  constructor(public dialogRef: MatDialogRef<HandPickerDialog>) {
  }

  protected readonly isValid = computed(() =>
    this.northCount() === 13 && this.southCount() === 13 && this.allSelectedCards().size === 26,
  );

  protected readonly helpText = computed(() => {
    if (this.northCount() !== 13) return `North needs ${13 - this.northCount()} more card(s).`;
    if (this.southCount() !== 13) return `South needs ${13 - this.southCount()} more card(s).`;
    return 'Selection is legal. Ready to continue.';
  });

  protected cardsForSuit(suit: SuitChar): CardCode[] {
    return this.ranksDesc.map((rank) => `${suit}${rank}` as CardCode);
  }

  protected suitSymbol(suit: SuitChar): string {
    switch (suit) {
      case 'S': return '♠';
      case 'H': return '♥';
      case 'D': return '♦';
      case 'C': return '♣';
    }
  }

  protected suitRanksForSeat(seat: PickerSeat, suit: SuitChar): string {
    const cards = seat === 'NORTH' ? this.north() : this.south();
    const ranks = cards
      .filter((card) => card[0] === suit)
      .map((card) => card[1])
      .join('');

    return ranks || '—';
  }


  protected assignmentOf(card: CardCode): PickerSeat | null {
    if (this.north().includes(card)) return 'NORTH';
    if (this.south().includes(card)) return 'SOUTH';
    return null;
  }

  protected toggleCard(card: CardCode): void {
    const current = this.assignmentOf(card);
    const target = this.activeSeat();

    if (current === target) {
      this.removeFrom(target, card);
      return;
    }

    if (current) {
      this.removeFrom(current, card);
    }

    if (this.countOf(target) >= 13) {
      return;
    }

    this.addTo(target, card);
  }

  protected clearSeat(seat: PickerSeat): void {
    if (seat === 'NORTH') this.north.set([]);
    else this.south.set([]);
  }

  protected continue(): void {
    if (!this.isValid()) return;

    this.dialogRef.close({
      north: this.sorted(this.north()),
      south: this.sorted(this.south()),
    });
  }

  private countOf(seat: PickerSeat): number {
    return seat === 'NORTH' ? this.northCount() : this.southCount();
  }

  private addTo(seat: PickerSeat, card: CardCode): void {
    if (seat === 'NORTH') this.north.update((cards) => [...cards, card]);
    else this.south.update((cards) => [...cards, card]);
  }

  private removeFrom(seat: PickerSeat, card: CardCode): void {
    if (seat === 'NORTH') this.north.update((cards) => cards.filter((c) => c !== card));
    else this.south.update((cards) => cards.filter((c) => c !== card));
  }

  private allSelectedCards(): Set<CardCode> {
    return new Set([...this.north(), ...this.south()]);
  }

  private sorted(cards: CardCode[]): CardCode[] {
    const suitOrder = ['S', 'H', 'D', 'C'];
    const rankOrder = 'AKQJT98765432';

    return [...cards].sort((a, b) => {
      const suitDiff = suitOrder.indexOf(a[0]) - suitOrder.indexOf(b[0]);
      if (suitDiff !== 0) return suitDiff;
      return rankOrder.indexOf(a[1]) - rankOrder.indexOf(b[1]);
    });
  }
}
