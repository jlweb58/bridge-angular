import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvancedQueryBuilderComponent } from './advanced-query-builder';

describe('AdvancedQueryBuilder', () => {
  let component: AdvancedQueryBuilderComponent;
  let fixture: ComponentFixture<AdvancedQueryBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvancedQueryBuilderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdvancedQueryBuilderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
