
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import { forkJoin } from 'rxjs';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth';

interface PlantItem {
  plantId: number;
  name: string;
  scientificName?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  categoryId: number;
  categoryName?: string | null;
}

interface CategoryItem {
  categoryId: number;
  name: string;
  description?: string | null;
}

interface CareGuideItem {
  plantCareGuideId: number;
  plantId: number;
  sunlightRequirement?: string | null;
  waterRequirement?: string | null;
  soilType?: string | null;
  wateringIntervalDays: number;
  additionalTips?: string | null;
}

type Section = 'plants' | 'categories' | 'guides';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  auth = inject(AuthService);

  private apiBase = 'https://localhost:7165/api';

  activeSection = signal<Section>('plants');

  plants = signal<PlantItem[]>([]);
  categories = signal<CategoryItem[]>([]);
  guides = signal<CareGuideItem[]>([]);

  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  plantSearch = signal('');
  categorySearch = signal('');

  plantFormVisible = signal(false);
  categoryFormVisible = signal(false);
  guideFormVisible = signal(false);

  editingPlantId = signal<number | null>(null);
  editingCategoryId = signal<number | null>(null);
  editingGuideId = signal<number | null>(null);

  totalPlants = computed(() => this.plants().length);
  totalCategories = computed(() => this.categories().length);
  totalGuides = computed(() => this.guides().length);

  // FILTER PLANTS
  filteredPlants = computed(() => {
    const query = this.plantSearch().trim().toLowerCase();

    return this.plants().filter(plant =>
      plant.name.toLowerCase().includes(query) ||
      (plant.scientificName ?? '')
        .toLowerCase().includes(query)
    );
  });

  // FILTER CATEGORIES
  filteredCategories = computed(() => {
    const query = this.categorySearch().trim().toLowerCase();

    return this.categories().filter(category =>
      category.name.toLowerCase().includes(query) ||
      (category.description ?? '')
        .toLowerCase().includes(query)
    );
  });

  // PLANTS WITHOUT CARE GUIDES
  plantsWithoutGuide = computed(() => {
    const covered = new Set(
      this.guides().map(guide => guide.plantId)
    );

    return this.plants().filter(
      plant => !covered.has(plant.plantId)
    );
  });

  // PLANT FORM
  plantForm = this.fb.nonNullable.group({
    name: ['', [
      Validators.required,
      Validators.maxLength(150)
    ]],

    scientificName: ['', [
      Validators.maxLength(300)
    ]],

    description: [''],

    imageUrl: [''],

    categoryId: [0, [
      Validators.required,
      Validators.min(1)
    ]]
  });

  // CATEGORY FORM
  categoryForm = this.fb.nonNullable.group({
    name: ['', [
      Validators.required,
      Validators.maxLength(100)
    ]],

    description: ['', [
      Validators.maxLength(300)
    ]]
  });

  // CARE GUIDE FORM
  guideForm = this.fb.nonNullable.group({
    plantId: [0, [
      Validators.required,
      Validators.min(1)
    ]],

    sunlightRequirement: ['', [
      Validators.required,
      Validators.maxLength(200)
    ]],

    waterRequirement: ['', [
      Validators.required,
      Validators.maxLength(200)
    ]],

    soilType: ['', [
      Validators.required,
      Validators.maxLength(200)
    ]],

    wateringIntervalDays: [7, [
      Validators.required,
      Validators.min(1),
      Validators.max(365)
    ]],

    additionalTips: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  // LOAD ALL DATA
  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      plants: this.http.get<PlantItem[]>(
        `${this.apiBase}/Plants`
      ),

      categories: this.http.get<CategoryItem[]>(
        `${this.apiBase}/Categories`
      ),

      guides: this.http.get<CareGuideItem[]>(
        `${this.apiBase}/PlantCareGuides`
      )
    }).subscribe({

      next: data => {

        this.plants.set(
          Array.isArray(data.plants) ? data.plants : []
        );

        this.categories.set(
          Array.isArray(data.categories) ? data.categories : []
        );

        this.guides.set(
          Array.isArray(data.guides) ? data.guides : []
        );

        this.loading.set(false);
      },

      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.showHttpError(error);
      }
    });
  }

  // REFRESH ALL DATA AFTER SAVE
  refreshAfterSave(message: string): void {

    forkJoin({
      plants: this.http.get<PlantItem[]>(
        `${this.apiBase}/Plants`
      ),

      categories: this.http.get<CategoryItem[]>(
        `${this.apiBase}/Categories`
      ),

      guides: this.http.get<CareGuideItem[]>(
        `${this.apiBase}/PlantCareGuides`
      )
    }).subscribe({

      next: data => {

        this.plants.set(
          Array.isArray(data.plants) ? data.plants : []
        );

        this.categories.set(
          Array.isArray(data.categories) ? data.categories : []
        );

        this.guides.set(
          Array.isArray(data.guides) ? data.guides : []
        );

        this.successMessage.set(message);
        this.errorMessage.set('');
      },

      error: (error: HttpErrorResponse) => {
        this.showHttpError(error);
      }
    });
  }

  // CHANGE ACTIVE SECTION
  showSection(section: Section): void {
    this.activeSection.set(section);

    this.plantFormVisible.set(false);
    this.categoryFormVisible.set(false);
    this.guideFormVisible.set(false);

    this.errorMessage.set('');
    this.successMessage.set('');
  }

  updatePlantSearch(event: Event): void {
    this.plantSearch.set(
      (event.target as HTMLInputElement).value
    );
  }

  updateCategorySearch(event: Event): void {
    this.categorySearch.set(
      (event.target as HTMLInputElement).value
    );
  }

  getCategoryName(plant: PlantItem): string {
    return this.categories().find(
      category => category.categoryId === plant.categoryId
    )?.name ?? plant.categoryName ?? 'Uncategorized';
  }

  getPlantName(plantId: number): string {
    return this.plants().find(
      plant => plant.plantId === plantId
    )?.name ?? `Plant #${plantId}`;
  }

  getPlantCount(categoryId: number): number {
    return this.plants().filter(
      plant => plant.categoryId === categoryId
    ).length;
  }

  // ======================
  // PLANT MANAGEMENT
  // ======================

  openAddPlant(): void {
    this.showSection('plants');

    this.editingPlantId.set(null);

    this.plantForm.reset({
      name: '',
      scientificName: '',
      description: '',
      imageUrl: '',
      categoryId: 0
    });

    this.plantFormVisible.set(true);
  }

  editPlant(plant: PlantItem): void {
    this.showSection('plants');

    this.editingPlantId.set(plant.plantId);

    this.plantForm.reset({
      name: plant.name,
      scientificName: plant.scientificName ?? '',
      description: plant.description ?? '',
      imageUrl: plant.imageUrl ?? '',
      categoryId: plant.categoryId
    });

    this.plantFormVisible.set(true);
  }

  cancelPlantForm(): void {
    if (!this.saving()) {
      this.plantFormVisible.set(false);
    }
  }

  savePlant(): void {

    if (this.plantForm.invalid) {
      this.plantForm.markAllAsTouched();
      return;
    }

    const value = this.plantForm.getRawValue();

    const request = {
      name: value.name.trim(),
      scientificName: value.scientificName.trim(),
      description: value.description.trim(),
      imageUrl: value.imageUrl.trim(),
      categoryId: value.categoryId
    };

    if (!request.name) {
      this.errorMessage.set('Plant name is required.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const id = this.editingPlantId();

    const operation = id === null
      ? this.http.post(`${this.apiBase}/Plants`, request)
      : this.http.put(`${this.apiBase}/Plants/${id}`, request);

    operation.subscribe({

      next: () => {

        this.saving.set(false);
        this.plantFormVisible.set(false);

        this.refreshAfterSave(
          id === null
            ? 'Plant added successfully!'
            : 'Plant updated successfully!'
        );
      },

      error: error => {
        this.saving.set(false);
        this.showHttpError(error);
      }
    });
  }

  deletePlant(plant: PlantItem): void {

    if (this.deleting()) return;

    if (!window.confirm(`Delete "${plant.name}"?`)) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set('');

    this.http.delete(
      `${this.apiBase}/Plants/${plant.plantId}`
    ).subscribe({

      next: () => {
        this.deleting.set(false);

        this.refreshAfterSave(
          'Plant deleted successfully!'
        );
      },

      error: error => {
        this.deleting.set(false);
        this.showHttpError(error);
      }
    });
  }

  // ======================
  // CATEGORY MANAGEMENT
  // ======================

  openAddCategory(): void {
    this.showSection('categories');

    this.editingCategoryId.set(null);

    this.categoryForm.reset({
      name: '',
      description: ''
    });

    this.categoryFormVisible.set(true);
  }

  editCategory(category: CategoryItem): void {
    this.showSection('categories');

    this.editingCategoryId.set(category.categoryId);

    this.categoryForm.reset({
      name: category.name,
      description: category.description ?? ''
    });

    this.categoryFormVisible.set(true);
  }

  cancelCategoryForm(): void {
    if (!this.saving()) {
      this.categoryFormVisible.set(false);
    }
  }

  saveCategory(): void {

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const value = this.categoryForm.getRawValue();

    const request = {
      name: value.name.trim(),
      description: value.description.trim()
    };

    if (!request.name) {
      this.errorMessage.set('Category name is required.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const id = this.editingCategoryId();

    const operation = id === null
      ? this.http.post(`${this.apiBase}/Categories`, request)
      : this.http.put(`${this.apiBase}/Categories/${id}`, request);

    operation.subscribe({

      next: () => {

        this.saving.set(false);
        this.categoryFormVisible.set(false);

        this.refreshAfterSave(
          id === null
            ? 'Category added successfully!'
            : 'Category updated successfully!'
        );
      },

      error: error => {
        this.saving.set(false);
        this.showHttpError(error);
      }
    });
  }

  deleteCategory(category: CategoryItem): void {

    if (this.deleting()) return;

    if (this.getPlantCount(category.categoryId) > 0) {
      this.errorMessage.set(
        'This category contains plants. Move those plants first.'
      );
      return;
    }

    if (!window.confirm(`Delete "${category.name}"?`)) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set('');

    this.http.delete(
      `${this.apiBase}/Categories/${category.categoryId}`
    ).subscribe({

      next: () => {
        this.deleting.set(false);

        this.refreshAfterSave(
          'Category deleted successfully!'
        );
      },

      error: error => {
        this.deleting.set(false);
        this.showHttpError(error);
      }
    });
  }

  // ======================
  // CARE GUIDES
  // ======================

  openAddGuide(): void {
    this.showSection('guides');

    this.editingGuideId.set(null);

    this.guideForm.reset({
      plantId: 0,
      sunlightRequirement: '',
      waterRequirement: '',
      soilType: '',
      wateringIntervalDays: 7,
      additionalTips: ''
    });

    this.guideForm.controls.plantId.enable();

    this.guideFormVisible.set(true);
  }

  editGuide(guide: CareGuideItem): void {
    this.showSection('guides');

    this.editingGuideId.set(guide.plantCareGuideId);

    this.guideForm.reset({
      plantId: guide.plantId,
      sunlightRequirement: guide.sunlightRequirement ?? '',
      waterRequirement: guide.waterRequirement ?? '',
      soilType: guide.soilType ?? '',
      wateringIntervalDays: guide.wateringIntervalDays,
      additionalTips: guide.additionalTips ?? ''
    });

    this.guideForm.controls.plantId.disable();

    this.guideFormVisible.set(true);
  }

  cancelGuideForm(): void {
    if (!this.saving()) {
      this.guideFormVisible.set(false);
      this.guideForm.controls.plantId.enable();
    }
  }

  saveGuide(): void {

    if (this.guideForm.invalid) {
      this.guideForm.markAllAsTouched();
      return;
    }

    const value = this.guideForm.getRawValue();

    const request = {
      plantId: value.plantId,
      sunlightRequirement: value.sunlightRequirement.trim(),
      waterRequirement: value.waterRequirement.trim(),
      soilType: value.soilType.trim(),
      wateringIntervalDays: value.wateringIntervalDays,
      additionalTips: value.additionalTips.trim()
    };

    const id = this.editingGuideId();

    if (
      id === null &&
      this.guides().some(
        guide => guide.plantId === request.plantId
      )
    ) {
      this.errorMessage.set(
        'This plant already has a care guide. Use Edit instead.'
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const operation = id === null
      ? this.http.post(
          `${this.apiBase}/PlantCareGuides`,
          request
        )
      : this.http.put(
          `${this.apiBase}/PlantCareGuides/${id}`,
          request
        );

    operation.subscribe({

      next: () => {

        this.saving.set(false);
        this.guideFormVisible.set(false);
        this.guideForm.controls.plantId.enable();

        this.refreshAfterSave(
          id === null
            ? 'Care guide added successfully!'
            : 'Care guide updated successfully!'
        );
      },

      error: error => {
        this.saving.set(false);
        this.showHttpError(error);
      }
    });
  }

  deleteGuide(guide: CareGuideItem): void {

    if (this.deleting()) return;

    if (!window.confirm(
      `Delete the care guide for "${this.getPlantName(guide.plantId)}"?`
    )) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set('');

    this.http.delete(
      `${this.apiBase}/PlantCareGuides/${guide.plantCareGuideId}`
    ).subscribe({

      next: () => {
        this.deleting.set(false);

        this.refreshAfterSave(
          'Care guide deleted successfully!'
        );
      },

      error: error => {
        this.deleting.set(false);
        this.showHttpError(error);
      }
    });
  }

  // ======================
  // COMMON HELPERS
  // ======================

  imageFailed(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  private showHttpError(error: HttpErrorResponse): void {

    console.error('GHARSA API Error:', error);

    if (error.status === 0) {

      this.errorMessage.set(
        'Cannot connect to GHARSA.API. Check the server.'
      );

    } else if (error.status === 401) {

      this.errorMessage.set(
        'Please sign in again.'
      );

    } else if (error.status === 403) {

      this.errorMessage.set(
        'Only Admin can perform this action.'
      );

    } else if (error.status === 400) {

      this.errorMessage.set(
        'Invalid data. Please check the form.'
      );

    } else if (error.status === 404) {

      this.errorMessage.set(
        'Record not found. Check the API route.'
      );

    } else if (error.status === 409) {

      this.errorMessage.set(
        'This record already exists or is linked to other data.'
      );

    } else {

      this.errorMessage.set(
        'Operation failed. Check the API response.'
      );
    }
  }
}
