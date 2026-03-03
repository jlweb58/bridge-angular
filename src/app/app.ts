import { Component, computed, inject, signal } from '@angular/core';
import { SingleDummyService } from './core/services/single-dummy.service';
import type { SingleDummyAnalyzeRequest, SingleDummyAnalyzeResponse } from './core/models/single-dummy';
import type { CardCode } from './core/models/cards';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly singleDummyService = inject(SingleDummyService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly request = signal<SingleDummyAnalyzeRequest | null>(null);
  protected readonly response = signal<SingleDummyAnalyzeResponse | null>(null);

  protected readonly requestJson = computed(() =>
    this.request() ? JSON.stringify(this.request(), null, 2) : ''
  );

  protected readonly responseJson = computed(() =>
    this.response() ? JSON.stringify(this.response(), null, 2) : ''
  );

  protected runSampleAnalysis(): void {
    this.error.set(null);
    this.response.set(null);

    const request: SingleDummyAnalyzeRequest = {
      declarer: 'SOUTH',
      dummy: 'NORTH',
      contract: {
        level: 4,
        denomination: 'SPADES',
      },
      hands: {
        // Only declarer + dummy required per your model docs
        NORTH: [
          'SA', 'SK', 'SQ', 'S2',
          'HA', 'H7', 'H3',
          'DK', 'D9', 'D5',
          'C8', 'C6', 'C2',
        ] as CardCode[],
        SOUTH: [
          'SJ', 'S9', 'S8', 'S7',
          'HK', 'HQ', 'H2',
          'DA', 'DQ', 'D2',
          'CA', 'CK', 'C3',
        ] as CardCode[],
      },
      samples: 500,
      seed: 12345, // optional; nice for repeatable results while testing UI
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
}
