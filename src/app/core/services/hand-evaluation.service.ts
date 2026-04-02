import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {catchError, map, type Observable, throwError} from 'rxjs';

import type { CardCode } from '../models/cards';
import {environment} from '../../../environments/environment';

interface HandEvaluationResponse {
  handValue: number;
}

interface HandEvaluationRequest {
  cards: CardCode[]
}

@Injectable({
  providedIn: 'root',
})
export class HandEvaluationService {
  private readonly http = inject(HttpClient);

  // Replace with your real base URL, or move it into environment.ts
  private serviceUrl = environment.baseUrl + '/hand-evaluation';

  evaluateHand(cards: CardCode[]): Observable<number> {
    return this.http
      .post<HandEvaluationResponse>(this.serviceUrl, {
        cards,
      })
      .pipe(
        map((response) => response.handValue),
        catchError((error: HttpErrorResponse) => {
          // Customize the error message
          const errorMessage = error.message || 'Failed to submit pick.';
          return throwError(() => new Error(errorMessage));
        })
      );
  }
}
