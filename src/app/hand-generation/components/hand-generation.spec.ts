import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HandGeneration } from './hand-generation';

describe('HandGeneration', () => {
  let component: HandGeneration;
  let fixture: ComponentFixture<HandGeneration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandGeneration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HandGeneration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
