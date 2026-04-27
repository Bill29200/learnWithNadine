import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormationList } from './formation-list';

describe('FormationList', () => {
  let component: FormationList;
  let fixture: ComponentFixture<FormationList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormationList],
    }).compileComponents();

    fixture = TestBed.createComponent(FormationList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
