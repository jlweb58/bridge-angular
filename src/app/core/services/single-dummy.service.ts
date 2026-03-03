import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {SingleDummyAnalyzeRequest, SingleDummyAnalyzeResponse} from '../models/single-dummy';
import {catchError, Observable, throwError} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SingleDummyService {

  private serviceUrl = environment.baseUrl + '/single-dummy/';

  constructor(private http: HttpClient) { }


  singleDummyAnalyze(request: SingleDummyAnalyzeRequest): Observable<SingleDummyAnalyzeResponse> {
    return this.http.post<SingleDummyAnalyzeResponse>(this.serviceUrl, request)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          // Customize the error message
          const errorMessage = error.message || 'Failed to submit pick.';
          return throwError(() => new Error(errorMessage));
        })
      );
  }
}
