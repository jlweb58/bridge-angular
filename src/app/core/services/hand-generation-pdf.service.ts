import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, Margins, TDocumentDefinitions } from 'pdfmake/interfaces';

import { type CardCode, type SuitChar } from '../models/cards';
import type { GeneratedHandPair } from './hand-generation.service';

type Player = 'WEST' | 'EAST';
type PdfMakeLike = {
  vfs?: Record<string, string>;
  fonts?: Record<string, { normal: string; bold?: string; italics?: string; bolditalics?: string }>;
  createPdf: typeof pdfMake.createPdf;
};

interface PdfExportOptions {
  batchId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HandGenerationPdfService {
  private readonly rankOrder = 'AKQJT98765432';
  private pdfReady = false;

  exportPlayerPdf(player: Player, hands: GeneratedHandPair[], options: PdfExportOptions = {}): void {
    this.ensurePdfMakeReady();

    const batchId = options.batchId ?? this.createBatchId();
    const filename = `${this.prettyPlayer(player)}_${batchId}.pdf`;

    const handSections: Content[] = hands.flatMap((pair, index): Content[] => [
      {
        unbreakable: true,
        stack: [
          {
            columns: [
              {
                width: 'auto',
                text: `Hand ${index + 1}`,
                style: 'pairTitle',
              },
              {
                width: '*',
                text: [
                  { text: 'Dealer: ', italics: true, bold: false },
                  { text: this.prettyPlayer(pair.dealer), italics: true, bold: false },
                  { text: '   Vul: ', italics: true, bold: false },
                  { text: pair.vulnerability, italics: true, bold: false },
                ],
                margin: [40, 0, 0, 0],
                noWrap: true,
              },
            ],
            columnGap: 10,
            margin: [0, index === 0 ? 0 : 12, 0, 4],
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
    if (this.pdfReady) return;

    const pdfMakeLike = pdfMake as PdfMakeLike;
    pdfMakeLike.vfs ??= pdfFonts as Record<string, string>;

    this.pdfReady = true;
  }

  private buildHandBlock(cards: CardCode[] | undefined): Content {
    const handCards = cards ?? [];

    return {
      stack: [
        {
          columns: [
            this.suitCell('S', handCards),
            this.suitCell('H', handCards),
            this.suitCell('D', handCards),
            this.suitCell('C', handCards),
          ],
          columnGap: 14,
        },
      ],
      margin: [0, 0, 0, 6],
    };
  }

  private suitLine(suit: SuitChar, cards: CardCode[]): Content {
    return {
      columns: [
        {
          width: 16,
          svg: this.suitSvg(suit),
          fit: [14, 14],
          margin: [0, 0, 0, 0],
        },
        {
          width: '*',
          text: this.suitRanks(cards, suit) || '—',
          style: 'cardText',
        },
      ],
      columnGap: 4,
      margin: [0, 1, 0, 3],
    };
  }
  private suitCell(suit: SuitChar, cards: CardCode[]): Content {
    const ranks = this.suitRanks(cards, suit) || '—';

    return {
      width: 'auto',
      columns: [
        {
          width: 16,
          svg: this.suitSvg(suit),
          fit: [14, 14],
          margin: [0, 0, 0, 0],
        },
        {
          width: 'auto',
          text: ranks,
          style: 'cardText',
        },
      ],
      columnGap: 4,

    } as Content;
  }

  private suitSvg(suit: SuitChar): string {
    const fill = suit === 'H' || suit === 'D' ? '#b91c1c' : '#000000';

    switch (suit) {
      case 'S':
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <path fill="${fill}" d="M60 10c-6 12-14 20-22 28-12 12-24 24-24 38 0 13 10 24 24 24 8 0 15-3 19-9l3-5 3 5c4 6 11 9 19 9 14 0 24-11 24-24 0-14-12-26-24-38-8-8-16-16-22-28z"/>
  <rect fill="${fill}" x="55" y="64" width="10" height="28" rx="2"/>
  <rect fill="${fill}" x="50" y="86" width="20" height="32" rx="2"/>
</svg>`;
      case 'H':
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <path fill="${fill}" d="M60 104 18 62C2 46 4 20 28 20c12 0 20 6 26 15 6-9 14-15 26-15 24 0 26 26 10 42L60 104z"/>
</svg>`;
      case 'D':
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <path fill="${fill}" d="M60 12 104 60 60 108 16 60 60 12z"/>
</svg>`;
      case 'C':
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle fill="${fill}" cx="60" cy="36" r="16"/>
  <circle fill="${fill}" cx="40" cy="58" r="16"/>
  <circle fill="${fill}" cx="80" cy="58" r="16"/>
  <rect fill="${fill}" x="54" y="56" width="12" height="26" rx="2"/>
  <rect fill="${fill}" x="50" y="78" width="20" height="14" rx="2"/>
</svg>`;
    }
  }

  private suitRanks(cards: CardCode[], suit: SuitChar): string {
    return cards
      .filter((card) => card[0] === suit)
      .sort((a, b) => this.rankOrder.indexOf(a[1]) - this.rankOrder.indexOf(b[1]))
      .map((card) => card[1])
      .join('');
  }

  private prettyPlayer(player: Player): string {
    return player.charAt(0) + player.slice(1).toLowerCase();
  }

  private createBatchId(): string {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
  }
}
