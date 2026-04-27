import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormateurDashboard } from './formateur-dashboard';

describe('FormateurDashboard', () => {
  let component: FormateurDashboard;
  let fixture: ComponentFixture<FormateurDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormateurDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(FormateurDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
