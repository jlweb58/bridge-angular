import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, Margins, TDocumentDefinitions } from 'pdfmake/interfaces';

import { type CardCode, type SuitChar } from '../../core/models/cards';
import type { GeneratedHandPair } from '../models/hand-generation-api.models';

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

  exportBothPdfs(hands: GeneratedHandPair[], batchId?: string): void {
    const resolvedBatchId = batchId ?? this.createBatchId();
    this.exportPlayerPdf('WEST', hands, { batchId: resolvedBatchId });
    this.exportPlayerPdf('EAST', hands, { batchId: resolvedBatchId });
    this.exportOverviewPdf(hands, { batchId: resolvedBatchId });
  }

  private ensurePdfMakeReady(): void {
    if (this.pdfReady) return;

    const pdfMakeLike = pdfMake as PdfMakeLike;
    pdfMakeLike.vfs ??= pdfFonts as Record<string, string>;

    this.pdfReady = true;
  }

  exportOverviewPdf(hands: GeneratedHandPair[], options: PdfExportOptions = {}): void {
    this.ensurePdfMakeReady();

    const batchId = options.batchId ?? this.createBatchId();
    const filename = `Overview_${batchId}.pdf`;

    const overviewBlocks = hands.map((pair, index) => this.buildOverviewHandSection(pair, index));

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [28, 30, 28, 30] as Margins,
      defaultStyle: {
        fontSize: 10,
        lineHeight: 1.15,
      },
      content: [
        { text: 'Hand overview', style: 'title' },
        { text: `Batch ${batchId}`, style: 'subtitle' },
        { text: ' ', margin: [0, 0, 0, 4] },
        ...overviewBlocks,
      ] as Content[],
      styles: {
        title: {
          fontSize: 17,
          bold: true,
        },
        subtitle: {
          fontSize: 9,
          color: '#555555',
          margin: [0, 3, 0, 0],
        },
        pairTitle: {
          fontSize: 12,
          bold: true,
        },
        handMeta: {
          fontSize: 10,
          italics: true,
          bold: false,
        },
        columnTitle: {
          fontSize: 10,
          bold: true,
          margin: [0, 0, 0, 4],
        },
        cardText: {
          fontSize: 10,
          margin: [0, 0, 0, 0],
        },
      },
    };

    pdfMake.createPdf(docDefinition).download(filename);
  }

  exportPlayerPdf(player: Player, hands: GeneratedHandPair[], options: PdfExportOptions = {}): void {
    this.ensurePdfMakeReady();

    const batchId = options.batchId ?? this.createBatchId();
    const filename = `${this.prettyPlayer(player)}_${batchId}.pdf`;

    const handBlocks = hands.map((pair, index) => this.buildHandSection(pair, index, player));
    const pages: Content[] = [];

    for (let i = 0; i < handBlocks.length; i += 10) {
      const pageHands = handBlocks.slice(i, i + 10);
      const leftColumn = pageHands.slice(0, 5);
      const rightColumn = pageHands.slice(5, 10);

      pages.push({
        table: {
          widths: ['*', '*'],
          body: [
            [
              {
                stack: leftColumn,
                margin: [0, 0, 9, 0],

              },
              {
                stack: rightColumn,
                margin: [9, 0, 0, 0],
              },
            ],
          ],
        },
         layout: 'noBorders',
        pageBreak: i === 0 ? undefined : 'before',
      });
    }

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
        ...pages,
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
        handMeta: {
          fontSize: 11,
          italics: true,
          bold: false,
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

  private buildHandSection(pair: GeneratedHandPair, index: number, player: Player): Content {
    return {
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
                { text: 'Dealer: ', style: 'handMeta' },
                { text: this.prettyPlayer(pair.dealer), style: 'handMeta' },
                { text: '   Vul: ', style: 'handMeta' },
                { text: pair.vulnerability, style: 'handMeta' },
              ],
              margin: [40, 0, 0, 0],
              noWrap: true,
            },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 4],
        },
        this.buildHandBlock(pair[player]),
      ],
    };
  }

  private buildHandBlock(cards: CardCode[] | undefined): Content {
    const handCards = cards ?? [];

    return {
      stack: [
        this.suitLine('S', handCards),
        this.suitLine('H', handCards),
        this.suitLine('D', handCards),
        this.suitLine('C', handCards),
      ],
      margin: [0, 0, 0, 6],
    };
  }

  private suitLine(suit: SuitChar, cards: CardCode[]): Content {
    const ranks = this.suitRanks(cards, suit) || '—';

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
          text: ranks,
          style: 'cardText',
        },
      ],
      columnGap: 4,
      margin: [0, 1, 0, 3],
    };
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

  private buildOverviewHandSection(pair: GeneratedHandPair, index: number): Content {
    const westLine: Content = this.buildHandOneLine(pair.WEST);
    const eastLine: Content = this.buildHandOneLine(pair.EAST);
    const contractRows: Content[] = this.buildContractRows(pair);

    const stackItems: Content[] = [
      {
        columns: [
          { width: 'auto', text: `Hand ${index + 1}`, style: 'pairTitle' },
          {
            width: '*',
            text: [
              { text: 'Dealer: ', style: 'handMeta' },
              { text: this.prettyPlayer(pair.dealer), style: 'handMeta' },
              { text: '   Vul: ', style: 'handMeta' },
              { text: pair.vulnerability, style: 'handMeta' },
            ],
            margin: [40, 0, 0, 0],
            noWrap: true,
          },
        ],
        margin: [0, 0, 0, 6],
        columnGap: 10,
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { stack: [{ text: 'West', style: 'columnTitle' }, westLine], margin: [0, 0, 8, 0] },
              { stack: [{ text: 'East', style: 'columnTitle' }, eastLine], margin: [8, 0, 0, 0] },
            ],
          ],
        },
        layout: 'noBorders',
      },
    ];

    if (contractRows.length > 0) {
      stackItems.push(
        { text: 'Contract results', style: 'columnTitle', margin: [0, 6, 0, 2] },
        ...contractRows,
      );
    }


    return {
      unbreakable: true,
      stack: [
        ...stackItems,
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.4, lineColor: '#d1d5db' },
          ],
          margin: [0, 3, 0, 4],
        },
      ],
      margin: [0, 0, 0, 2],
    };
  }

  private buildHandOneLine(cards: CardCode[] | undefined): Content {
    const handCards = cards ?? [];

    return {
      columns: [
        { width: 12, svg: this.suitSvg('S'), fit: [10, 10], margin: [0, 1, 1, 0] },
        { width: 'auto', text: this.suitRanks(handCards, 'S') || '—', style: 'cardText', margin: [0, 0, 6, 0] },

        { width: 12, svg: this.suitSvg('H'), fit: [10, 10], margin: [0, 1, 1, 0] },
        { width: 'auto', text: this.suitRanks(handCards, 'H') || '—', style: 'cardText', margin: [0, 0, 6, 0] },

        { width: 12, svg: this.suitSvg('D'), fit: [10, 10], margin: [0, 1, 1, 0] },
        { width: 'auto', text: this.suitRanks(handCards, 'D') || '—', style: 'cardText', margin: [0, 0, 6, 0] },

        { width: 12, svg: this.suitSvg('C'), fit: [10, 10], margin: [0, 1, 1, 0] },
        { width: '*', text: this.suitRanks(handCards, 'C') || '—', style: 'cardText' },
      ],
      columnGap: 2,
      margin: [0, 0, 0, 2],
    };
  }

  private buildContractRows(pair: GeneratedHandPair): Content[] {
    const rows = pair.contractScores ?? [];

    return rows.map((score): Content => ({
      columns: [
        { width: 42, text: `#${score.rank}`, bold: true },
        {
          width: 72,
          columns: [
            { width: 'auto', text: `${score.contract.level}` },
            this.contractDenominationCell(score.contract.denomination),
          ],
          columnGap: 6,
        },
        { width: 'auto', text: `${score.successProbability}%`, bold: true, color: '#166534' },
      ],
      columnGap: 8,
      margin: [0, 0, 0, 2],
    }));
  }

  private contractDenominationCell(denomination: string): Content {
    switch (denomination) {
      case 'SPADES':
        return { svg: this.suitSvg('S'), fit: [10, 10], margin: [0, 1, 0, 0] };
      case 'HEARTS':
        return { svg: this.suitSvg('H'), fit: [10, 10], margin: [0, 1, 0, 0] };
      case 'DIAMONDS':
        return { svg: this.suitSvg('D'), fit: [10, 10], margin: [0, 1, 0, 0] };
      case 'CLUBS':
        return { svg: this.suitSvg('C'), fit: [10, 10], margin: [0, 1, 0, 0] };
      case 'NOTRUMP':
      default:
        return { text: 'NT' };
    }
  }
}
