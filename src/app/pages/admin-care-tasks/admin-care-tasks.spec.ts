import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminCareTasks } from './admin-care-tasks';

describe('AdminCareTasks', () => {
  let component: AdminCareTasks;
  let fixture: ComponentFixture<AdminCareTasks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCareTasks],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCareTasks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
