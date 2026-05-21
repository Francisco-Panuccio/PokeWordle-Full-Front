import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetitiveMenuComponent } from './competitive-menu.component';

describe('CompetitiveMenuComponent', () => {
  let component: CompetitiveMenuComponent;
  let fixture: ComponentFixture<CompetitiveMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompetitiveMenuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompetitiveMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
