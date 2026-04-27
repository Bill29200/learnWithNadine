import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtudiantDashboard } from './etudiant-dashboard';

describe('EtudiantDashboard', () => {
  let component: EtudiantDashboard;
  let fixture: ComponentFixture<EtudiantDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtudiantDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(EtudiantDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
