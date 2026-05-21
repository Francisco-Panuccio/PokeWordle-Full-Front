import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetitiveWordleComponent } from './competitive-wordle.component';

describe('CompetitiveWordleComponent', () => {
  let component: CompetitiveWordleComponent;
  let fixture: ComponentFixture<CompetitiveWordleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompetitiveWordleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompetitiveWordleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
