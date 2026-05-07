import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, type Observable, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { type CardCode, type SuitChar } from '../../core/models/cards';

export type Player = 'WEST' | 'EAST';

export interface Range {
  min: number;
  max: number;
}

export type BackendSuit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';

export interface SuitLengthCondition {
  suit: BackendSuit;
  range: Range;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Array<ConditionGroup | SuitLengthCondition>;
}

interface HandConstraint {
  minPoints: number;
  maxPoints: number;
  handDistribution?: {
    suitLengths: Record<SuitChar, Range>;
  };
  condition?: ConditionGroup;
}

export type HandEvaluator = 'standard' | 'kaplan-rubens' | 'bergen';
export type ContractDenomination = 'CLUBS' | 'DIAMONDS' | 'HEARTS' | 'SPADES' | 'NOTRUMP';

export interface ContractSuggestion {
  level: number;
  denomination: ContractDenomination;
}

export interface ContractScore {
  contract: ContractSuggestion;
  successProbability: number;
  rank: number;
}

export interface HandGenerationRequest {
  parameters: Record<Player, HandConstraint>;
  numberOfHands: number;
  evaluator: HandEvaluator;
  contractSuggestions?: ContractSuggestion[];
}

export interface GeneratedHandPair {
  dealer: Player;
  vulnerability: string;
  WEST: CardCode[];
  EAST: CardCode[];
  contractScores?: ContractScore[];
}

export interface HandGenerationResponse {
  hands: GeneratedHandPair[];
}

@Injectable({
  providedIn: 'root',
})
export class HandGenerationService {
  private readonly http = inject(HttpClient);
  private readonly serviceUrl = environment.baseUrl + '/hand-generation';

  generateHands(request: HandGenerationRequest): Observable<HandGenerationResponse> {
    return this.http.post<HandGenerationResponse>(this.serviceUrl, request).pipe(
      catchError((error: HttpErrorResponse) => {
        const errorMessage = error.message || 'Failed to generate hands.';
        return throwError(() => new Error(errorMessage));
      }),
    );
  }
}
