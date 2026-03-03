import { TestBed } from '@angular/core/testing';

import { SingleDummyService } from './single-dummy.service';

describe('SingleDummy', () => {
  let service: SingleDummyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SingleDummyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
