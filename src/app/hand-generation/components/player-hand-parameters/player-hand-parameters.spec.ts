import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerHandParametersComponent } from './player-hand-parameters';

describe('PlayerHandParameters', () => {
  let component: PlayerHandParametersComponent;
  let fixture: ComponentFixture<PlayerHandParametersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerHandParametersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerHandParametersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
