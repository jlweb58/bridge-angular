import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerHandParameters } from './player-hand-parameters';

describe('PlayerHandParameters', () => {
  let component: PlayerHandParameters;
  let fixture: ComponentFixture<PlayerHandParameters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerHandParameters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerHandParameters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
