import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SingleDummyService {

  private serviceUrl = environment.baseUrl + '/single-dummy/';

  constructor(private http: HttpClient) { }


}
