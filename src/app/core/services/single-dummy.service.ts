import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {SingleDummyAnalyzeRequest, SingleDummyAnalyzeResponse} from '../models/single-dummy';
import {catchError, Observable, throwError} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SingleDummyService {

  private serviceUrl = environment.baseUrl + '/single-dummy';

  constructor(private http: HttpClient) { }


  singleDummyAnalyze(request: SingleDummyAnalyzeRequest): Observable<SingleDummyAnalyzeResponse> {
    return this.http.post<SingleDummyAnalyzeResponse>(this.serviceUrl, request)
      .pipe(
        catchError((error: HttpErrorResponse) => throwError(() => new Error(toErrorMessage(error))))
      );
  }
}

function toErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 422) {
    return 'No deals matching the hand constraints could be found. '
      + 'The constraints may be too restrictive or incompatible with the known hands.';
  }
  if (error.status === 400) {
    const detail = typeof error.error?.message === 'string' ? error.error.message : null;
    return detail ? `Invalid analysis request: ${detail}` : 'Invalid analysis request.';
  }
  return error.message || 'Single dummy analysis failed.';
}
