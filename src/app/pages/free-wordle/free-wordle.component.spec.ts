import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreeWordleComponent } from './free-wordle.component';

describe('FreeWordleComponent', () => {
  let component: FreeWordleComponent;
  let fixture: ComponentFixture<FreeWordleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreeWordleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreeWordleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
