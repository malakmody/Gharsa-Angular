import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

interface CareTaskItem {
  careTaskId: number;
  name: string;
  description: string | null;
}

interface PlantItem {
  plantId: number;
  name: string;
}

interface PlantCareTaskItem {
  plantId: number;
  careTaskId: number;
  intervalDays: number | null;
}

type Section = 'tasks' | 'assignments';

@Component({
  selector: 'app-admin-care-tasks',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-care-tasks.html',
  styleUrl: './admin-care-tasks.css'
})
export class AdminCareTasks implements OnInit {

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  private apiBase = 'https://localhost:7165/api';

  activeSection = signal<Section>('tasks');

  tasks = signal<CareTaskItem[]>([]);
  plants = signal<PlantItem[]>([]);
  assignments = signal<PlantCareTaskItem[]>([]);

  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);

  taskFormVisible = signal(false);
  assignmentFormVisible = signal(false);

  editingTaskId = signal<number | null>(null);

  editingAssignment = signal<{
    plantId: number;
    careTaskId: number;
  } | null>(null);

  errorMessage = signal('');
  successMessage = signal('');
  searchText = signal('');

  totalTasks = computed(() => this.tasks().length);

  totalAssignments = computed(() =>
    this.assignments().length
  );

  // FILTER TASKS
  filteredTasks = computed(() => {
    const q = this.searchText().trim().toLowerCase();

    return this.tasks().filter(task =>
      task.name.toLowerCase().includes(q) ||
      (task.description ?? '').toLowerCase().includes(q)
    );
  });

  // CARE TASK FORM
  taskForm = this.fb.nonNullable.group({
    name: ['', [
      Validators.required,
      Validators.maxLength(100)
    ]],

    description: ['', [
      Validators.maxLength(300)
    ]]
  });

  // PLANT-CARE TASK ASSIGNMENT FORM
  assignmentForm = this.fb.nonNullable.group({
    plantId: [0, [
      Validators.required,
      Validators.min(1)
    ]],

    careTaskId: [0, [
      Validators.required,
      Validators.min(1)
    ]],

    intervalDays: [7, [
      Validators.required,
      Validators.min(1),
      Validators.max(365)
    ]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  // LOAD ALL DATA
  loadData(): void {

    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      tasks: this.http.get<CareTaskItem[]>(
        `${this.apiBase}/CareTasks`
      ),

      plants: this.http.get<PlantItem[]>(
        `${this.apiBase}/Plants`
      ),

      assignments: this.http.get<PlantCareTaskItem[]>(
        `${this.apiBase}/PlantCareTasks`
      )
    }).subscribe({

      next: data => {

        this.tasks.set(
          Array.isArray(data.tasks) ? data.tasks : []
        );

        this.plants.set(
          Array.isArray(data.plants) ? data.plants : []
        );

        this.assignments.set(
          Array.isArray(data.assignments)
            ? data.assignments
            : []
        );

        this.loading.set(false);
      },

      error: (error: HttpErrorResponse) => {

        this.loading.set(false);
        this.handleError(error);
      }
    });
  }

  // CHANGE ACTIVE SECTION
  showSection(section: Section): void {

    this.activeSection.set(section);

    this.taskFormVisible.set(false);
    this.assignmentFormVisible.set(false);

    this.errorMessage.set('');
    this.successMessage.set('');
  }

  updateSearch(event: Event): void {

    this.searchText.set(
      (event.target as HTMLInputElement).value
    );
  }

  getPlantName(id: number): string {

    return this.plants().find(
      plant => plant.plantId === id
    )?.name ?? `Plant #${id}`;
  }

  getTaskName(id: number): string {

    return this.tasks().find(
      task => task.careTaskId === id
    )?.name ?? `Task #${id}`;
  }

  // ======================
  // CARE TASKS CRUD
  // ======================

  openAddTask(): void {

    this.showSection('tasks');

    this.editingTaskId.set(null);

    this.taskForm.reset({
      name: '',
      description: ''
    });

    this.taskFormVisible.set(true);
  }

  openEditTask(task: CareTaskItem): void {

    this.showSection('tasks');

    this.editingTaskId.set(task.careTaskId);

    this.taskForm.reset({
      name: task.name,
      description: task.description ?? ''
    });

    this.taskFormVisible.set(true);
  }

  closeTaskForm(): void {

    if (!this.saving()) {
      this.taskFormVisible.set(false);
    }
  }

  // ADD OR UPDATE TASK
  saveTask(): void {

    if (this.saving()) return;

    if (this.taskForm.invalid) {

      this.taskForm.markAllAsTouched();
      return;
    }

    const value = this.taskForm.getRawValue();

    const request = {
      name: value.name.trim(),
      description: value.description.trim()
    };

    if (!request.name) {

      this.taskForm.controls.name.setErrors({
        required: true
      });

      return;
    }

    this.saving.set(true);

    this.errorMessage.set('');
    this.successMessage.set('');

    const id = this.editingTaskId();

    const operation = id === null

      ? this.http.post(
          `${this.apiBase}/CareTasks`,
          request
        )

      : this.http.put(
          `${this.apiBase}/CareTasks/${id}`,
          request
        );

    operation.subscribe({

      next: () => {

        this.saving.set(false);
        this.taskFormVisible.set(false);

        this.successMessage.set(
          id === null
            ? 'Care task added successfully!'
            : 'Care task updated successfully!'
        );

        this.refreshData();
      },

      error: (error: HttpErrorResponse) => {

        this.saving.set(false);
        this.handleError(error);
      }
    });
  }

  // DELETE TASK
  deleteTask(task: CareTaskItem): void {

    if (this.deleting() || this.saving()) return;

    const linked = this.assignments().some(
      assignment =>
        assignment.careTaskId === task.careTaskId
    );

    if (linked) {

      this.errorMessage.set(
        'Remove this task from its plants before deleting it.'
      );

      return;
    }

    if (!window.confirm(
      `Delete care task "${task.name}"?`
    )) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set('');

    this.http.delete(
      `${this.apiBase}/CareTasks/${task.careTaskId}`
    ).subscribe({

      next: () => {

        this.deleting.set(false);

        this.successMessage.set(
          'Care task deleted successfully!'
        );

        this.refreshData();
      },

      error: (error: HttpErrorResponse) => {

        this.deleting.set(false);
        this.handleError(error);
      }
    });
  }

  // ======================
  // PLANT-TASK ASSIGNMENTS
  // ======================

  openAddAssignment(): void {

    this.showSection('assignments');

    this.editingAssignment.set(null);

    this.assignmentForm.reset({
      plantId: 0,
      careTaskId: 0,
      intervalDays: 7
    });

    this.assignmentForm.controls.plantId.enable();
    this.assignmentForm.controls.careTaskId.enable();

    this.assignmentFormVisible.set(true);
  }

  openEditAssignment(
    assignment: PlantCareTaskItem
  ): void {

    this.showSection('assignments');

    this.editingAssignment.set({
      plantId: assignment.plantId,
      careTaskId: assignment.careTaskId
    });

    this.assignmentForm.reset({
      plantId: assignment.plantId,
      careTaskId: assignment.careTaskId,
      intervalDays: assignment.intervalDays ?? 7
    });

    this.assignmentForm.controls.plantId.disable();
    this.assignmentForm.controls.careTaskId.disable();

    this.assignmentFormVisible.set(true);
  }

  closeAssignmentForm(): void {

    if (this.saving()) return;

    this.assignmentFormVisible.set(false);

    this.assignmentForm.controls.plantId.enable();
    this.assignmentForm.controls.careTaskId.enable();
  }

  // ADD OR UPDATE ASSIGNMENT
  saveAssignment(): void {

    if (this.saving()) return;

    if (this.assignmentForm.invalid) {

      this.assignmentForm.markAllAsTouched();
      return;
    }

    const value = this.assignmentForm.getRawValue();

    const existing = this.editingAssignment();

    // CHECK DUPLICATE ASSIGNMENT
    if (
      existing === null &&
      this.assignments().some(assignment =>
        assignment.plantId === value.plantId &&
        assignment.careTaskId === value.careTaskId
      )
    ) {

      this.errorMessage.set(
        'This task is already assigned to this plant.'
      );

      return;
    }

    const request = {
      plantId: value.plantId,
      careTaskId: value.careTaskId,
      intervalDays: value.intervalDays
    };

    this.saving.set(true);

    this.errorMessage.set('');
    this.successMessage.set('');

    const operation = existing === null

      ? this.http.post(
          `${this.apiBase}/PlantCareTasks`,
          request
        )

      : this.http.put(
          `${this.apiBase}/PlantCareTasks/${existing.plantId}/${existing.careTaskId}`,
          request
        );

    operation.subscribe({

      next: () => {

        this.saving.set(false);

        this.assignmentFormVisible.set(false);

        this.assignmentForm.controls.plantId.enable();
        this.assignmentForm.controls.careTaskId.enable();

        this.successMessage.set(
          existing === null
            ? 'Task assigned to plant successfully!'
            : 'Assignment updated successfully!'
        );

        this.refreshData();
      },

      error: (error: HttpErrorResponse) => {

        this.saving.set(false);
        this.handleError(error);
      }
    });
  }

  // DELETE ASSIGNMENT
  deleteAssignment(
    assignment: PlantCareTaskItem
  ): void {

    if (this.deleting() || this.saving()) return;

    if (!window.confirm(
      `Remove "${this.getTaskName(assignment.careTaskId)}" from "${this.getPlantName(assignment.plantId)}"?`
    )) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set('');

    this.http.delete(
      `${this.apiBase}/PlantCareTasks/${assignment.plantId}/${assignment.careTaskId}`
    ).subscribe({

      next: () => {

        this.deleting.set(false);

        this.successMessage.set(
          'Task removed from plant successfully!'
        );

        this.refreshData();
      },

      error: (error: HttpErrorResponse) => {

        this.deleting.set(false);
        this.handleError(error);
      }
    });
  }

  // ======================
  // REFRESH DATA
  // ======================

  private refreshData(): void {

    forkJoin({
      tasks: this.http.get<CareTaskItem[]>(
        `${this.apiBase}/CareTasks`
      ),

      plants: this.http.get<PlantItem[]>(
        `${this.apiBase}/Plants`
      ),

      assignments: this.http.get<PlantCareTaskItem[]>(
        `${this.apiBase}/PlantCareTasks`
      )
    }).subscribe({

      next: data => {

        this.tasks.set(
          Array.isArray(data.tasks) ? data.tasks : []
        );

        this.plants.set(
          Array.isArray(data.plants) ? data.plants : []
        );

        this.assignments.set(
          Array.isArray(data.assignments)
            ? data.assignments
            : []
        );
      },

      error: (error: HttpErrorResponse) => {

        this.handleError(error);
      }
    });
  }

  // ======================
  // ERROR HANDLING
  // ======================

  private handleError(
    error: HttpErrorResponse
  ): void {

    console.error('GHARSA API Error:', error);

    if (error.status === 0) {

      this.errorMessage.set(
        'Cannot connect to GHARSA.API.'
      );

    } else if (error.status === 401) {

      this.errorMessage.set(
        'Your session expired. Sign in again.'
      );

    } else if (error.status === 403) {

      this.errorMessage.set(
        'Only Admin can perform this action.'
      );

    } else if (error.status === 404) {

      this.errorMessage.set(
        'API endpoint or record was not found.'
      );

    } else if (error.status === 400) {

      this.errorMessage.set(
        'Invalid data. Check the form fields.'
      );

    } else if (error.status === 409) {

      this.errorMessage.set(
        'This task or assignment already exists or is linked to other data.'
      );

    } else {

      this.errorMessage.set(
        'Operation failed. Check the API response.'
      );
    }
  }
}