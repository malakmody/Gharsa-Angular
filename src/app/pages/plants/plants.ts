
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

import { RouterLink } from '@angular/router';

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
}

@Component({
  selector: 'app-plants',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './plants.html',
  styleUrl: './plants.css'
})
export class Plants implements OnInit {

  private http = inject(HttpClient);

  private apiBase = 'https://localhost:7165/api';

  plants = signal<PlantItem[]>([]);
  categories = signal<CategoryItem[]>([]);

  searchText = signal('');
  selectedCategory = signal(0);

  loading = signal(true);
  errorMessage = signal('');
  categoryError = signal('');

  filteredPlants = computed(() => {

    const search = this.searchText()
      .trim()
      .toLowerCase();

    const category = this.selectedCategory();

    return this.plants().filter(plant => {

      const matchesSearch =
        !search ||
        (plant.name ?? '')
          .toLowerCase()
          .includes(search) ||
        (plant.scientificName ?? '')
          .toLowerCase()
          .includes(search) ||
        (plant.description ?? '')
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        category === 0 ||
        plant.categoryId === category;

      return matchesSearch && matchesCategory;
    });
  });

  ngOnInit(): void {
    this.loadPlants();
    this.loadCategories();
  }

  loadPlants(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.http.get<PlantItem[]>(
      `${this.apiBase}/Plants`
    ).subscribe({

      next: (data) => {
        this.plants.set(
          Array.isArray(data) ? data : []
        );

        this.loading.set(false);
      },

      error: (error: HttpErrorResponse) => {
        console.error('Plants API error:', error);

        this.errorMessage.set(
          'Unable to load plants. Please check the server.'
        );

        this.loading.set(false);
      }

    });
  }

  loadCategories(): void {
    this.categoryError.set('');

    this.http.get<CategoryItem[]>(
      `${this.apiBase}/Categories`
    ).subscribe({

      next: (data) => {
        this.categories.set(
          Array.isArray(data) ? data : []
        );
      },

      error: (error: HttpErrorResponse) => {
        console.error('Categories API error:', error);

        this.categoryError.set(
          'Categories are temporarily unavailable.'
        );
      }

    });
  }

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText.set(input.value);
  }

  chooseCategory(categoryId: number): void {
    this.selectedCategory.set(categoryId);
  }

  clearFilters(): void {
    this.searchText.set('');
    this.selectedCategory.set(0);
  }

  getCategoryName(plant: PlantItem): string {

    if (plant.categoryName) {
      return plant.categoryName;
    }

    const category = this.categories().find(
      c => c.categoryId === plant.categoryId
    );

    return category?.name ?? 'Plant';
  }

  imageFailed(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
