import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvancedQueryBuilder } from './advanced-query-builder';

describe('AdvancedQueryBuilder', () => {
  let component: AdvancedQueryBuilder;
  let fixture: ComponentFixture<AdvancedQueryBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedQueryBuilder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdvancedQueryBuilder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
