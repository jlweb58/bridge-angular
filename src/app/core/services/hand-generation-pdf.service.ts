import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, Margins, TDocumentDefinitions } from 'pdfmake/interfaces';

import { type CardCode, type SuitChar } from '../models/cards';
import type { GeneratedHandPair } from './hand-generation.service';

type Player = 'WEST' | 'EAST';
type PdfMakeLike = typeof pdfMake & { vfs?: Record<string, string> };

interface PdfExportOptions {
  batchId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HandGenerationPdfService {
  private readonly suitChars: SuitChar[] = ['S', 'H', 'D', 'C'];
  private readonly rankOrder = 'AKQJT98765432';
  private vfsReady = false;

  exportPlayerPdf(player: Player, hands: GeneratedHandPair[], options: PdfExportOptions = {}): void {
    this.ensurePdfMakeReady();

    const batchId = options.batchId ?? this.createBatchId();
    const filename = `${this.prettyPlayer(player)}_${batchId}.pdf`;

    const handSections: Content[] = hands.flatMap((pair, index): Content[] => [
      {
        unbreakable: true,
        stack: [
          {
            text: `Hand pair ${index + 1}`,
            style: 'pairTitle',
            margin: [0, index === 0 ? 0 : 12, 0, 6],
          },
          this.buildHandBlock(pair[player]),
        ],
      },
    ]);

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [28, 30, 28, 30] as Margins,
      defaultStyle: {
        fontSize: 11,
        lineHeight: 1.2,
      },
      content: [
        { text: `${this.prettyPlayer(player)} hand practice`, style: 'title' },
        { text: `Batch ${batchId}`, style: 'subtitle' },
        { text: ' ', margin: [0, 0, 0, 4] },
        ...handSections,
      ] as Content[],
      styles: {
        title: {
          fontSize: 18,
          bold: true,
        },
        subtitle: {
          fontSize: 10,
          color: '#555555',
          margin: [0, 3, 0, 0],
        },
        pairTitle: {
          fontSize: 13,
          bold: true,
        },
        suitSymbol: {
          bold: true,
          fontSize: 13,
        },
        redSuit: {
          color: '#b91c1c',
        },
        blackSuit: {
          color: '#000000',
        },
        cardText: {
          fontSize: 11,
          margin: [0, 0, 0, 0],
        },
      },
    };

    pdfMake.createPdf(docDefinition).download(filename);
  }

  exportBothPdfs(hands: GeneratedHandPair[], batchId?: string): void {
    const resolvedBatchId = batchId ?? this.createBatchId();
    this.exportPlayerPdf('WEST', hands, { batchId: resolvedBatchId });
    this.exportPlayerPdf('EAST', hands, { batchId: resolvedBatchId });
  }

  private ensurePdfMakeReady(): void {
    if (this.vfsReady) return;

    (pdfMake as PdfMakeLike).vfs = pdfFonts as Record<string, string>;
    this.vfsReady = true;
    }

  private buildHandBlock(cards: CardCode[] | undefined): Content {
    return {
      columns: [
        {
          width: '*',
          columns: [
            { width: 14, text: '♠', style: ['suitSymbol', 'blackSuit'] },
            { width: '*', text: this.suitRanks(cards ?? [], 'S') || '—', style: 'cardText' },
          ],
          columnGap: 4,
        },
        {
          width: '*',
          columns: [
            { width: 14, text: '♥', style: ['suitSymbol', 'redSuit'] },
            { width: '*', text: this.suitRanks(cards ?? [], 'H') || '—', style: 'cardText' },
          ],
          columnGap: 4,
        },
        {
          width: '*',
          columns: [
            { width: 14, text: '♦', style: ['suitSymbol', 'redSuit'] },
            { width: '*', text: this.suitRanks(cards ?? [], 'D') || '—', style: 'cardText' },
          ],
          columnGap: 4,
        },
        {
          width: '*',
          columns: [
            { width: 14, text: '♣', style: ['suitSymbol', 'blackSuit'] },
            { width: '*', text: this.suitRanks(cards ?? [], 'C') || '—', style: 'cardText' },
          ],
          columnGap: 4,
        },
      ],
      columnGap: 10,
      margin: [0, 0, 0, 6],
    };
  }

  private suitRanks(cards: CardCode[], suit: SuitChar): string {
    return cards
      .filter((card) => card[0] === suit)
      .sort((a, b) => this.rankOrder.indexOf(a[1]) - this.rankOrder.indexOf(b[1]))
      .map((card) => card[1])
      .join('');
  }

  private suitSymbol(suit: SuitChar): string {
    switch (suit) {
      case 'S': return '♠';
      case 'H': return '♥';
      case 'D': return '♦';
      case 'C': return '♣';
    }
  }

  private isRedSuit(suit: SuitChar): boolean {
    return suit === 'H' || suit === 'D';
  }

  private prettyPlayer(player: Player): string {
    return player.charAt(0) + player.slice(1).toLowerCase();
  }

  private createBatchId(): string {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
  }
}
