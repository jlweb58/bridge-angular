import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, type Observable, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {HandGenerationRequest, HandGenerationResponse} from '../models/hand-generation-api.models';



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
