import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CareSchedule } from './care-schedule';

describe('CareSchedule', () => {
  let component: CareSchedule;
  let fixture: ComponentFixture<CareSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareSchedule],
    }).compileComponents();

    fixture = TestBed.createComponent(CareSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
