import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentWordleComponent } from './tournament-wordle.component';

describe('TournamentWordleComponent', () => {
  let component: TournamentWordleComponent;
  let fixture: ComponentFixture<TournamentWordleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentWordleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TournamentWordleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
