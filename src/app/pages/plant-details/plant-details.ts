
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

interface PlantInfo {
  plantId: number;
  name: string;
  scientificName?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  categoryId: number;
  categoryName?: string | null;
}

interface PlantCareGuide {
  plantCareGuideId: number;
  plantId: number;
  plantName?: string;
  sunlightRequirement?: string | null;
  waterRequirement?: string | null;
  soilType?: string | null;
  wateringIntervalDays?: number | null;
  additionalTips?: string | null;
}

interface MyPlantItem {
  myPlantId: number;
  plantId: number;
  plantName?: string | null;
  nickname?: string | null;
}

@Component({
  selector: 'app-plant-details',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './plant-details.html',
  styleUrl: './plant-details.css'
})
export class PlantDetails implements OnInit {

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private apiBase = 'https://localhost:7165/api';

  // DATA
  plant = signal<PlantInfo | null>(null);
  careGuide = signal<PlantCareGuide | null>(null);

  // LOADING AND ERRORS
  loading = signal(true);
  errorMessage = signal('');

  // ADD TO MY PLANTS
  adding = signal(false);
  addMessage = signal('');
  addSuccess = signal(false);

  // IMAGE
  imageError = signal(false);

  ngOnInit(): void {

    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    if (!Number.isInteger(id) || id <= 0) {

      this.errorMessage.set('Invalid plant ID.');
      this.loading.set(false);

      return;
    }

    this.loadPlant(id);
  }

  // =========================
  // LOAD PLANT DETAILS
  // =========================

  loadPlant(id: number): void {

    this.loading.set(true);
    this.errorMessage.set('');
    this.imageError.set(false);

    this.plant.set(null);
    this.careGuide.set(null);

    this.http.get<PlantInfo>(
      `${this.apiBase}/Plants/${id}`
    ).subscribe({

      next: (data) => {

        this.plant.set(data);
        this.loading.set(false);

        // Load care guide for selected plant
        this.loadCareGuide(data.plantId);
      },

      error: (error: HttpErrorResponse) => {

        console.error(
          'Plant loading error:',
          error
        );

        this.errorMessage.set(
          error.status === 404
            ? 'Plant not found.'
            : 'Unable to load plant details.'
        );

        this.loading.set(false);
      }

    });
  }

  // =========================
  // LOAD PLANT CARE GUIDE
  // =========================

  loadCareGuide(plantId: number): void {

    this.http.get<PlantCareGuide>(
      `${this.apiBase}/PlantCareGuides/plant/${plantId}`
    ).subscribe({

      next: (guide) => {

        this.careGuide.set(guide);
      },

      error: (error: HttpErrorResponse) => {

        if (error.status === 404) {

          // No care guide available for this plant
          this.careGuide.set(null);

          return;
        }

        console.error(
          'Care guide loading error:',
          error
        );

        this.careGuide.set(null);
      }

    });
  }

  // =========================
  // ADD PLANT TO MY COLLECTION
  // =========================

  addToMyPlants(): void {

    const selectedPlant = this.plant();

    if (!selectedPlant || this.adding()) {
      return;
    }

    this.adding.set(true);
    this.addMessage.set('');
    this.addSuccess.set(false);

    // First check user's existing collection
    this.http.get<MyPlantItem[]>(
      `${this.apiBase}/MyPlants`
    ).subscribe({

      next: (myPlants) => {

        const alreadyExists = Array.isArray(myPlants) &&
          myPlants.some(
            item => item.plantId === selectedPlant.plantId
          );

        if (alreadyExists) {

          this.adding.set(false);

          this.addMessage.set(
            'This plant is already in your collection.'
          );

          return;
        }

        // Add plant if it does not already exist
        this.createMyPlant(selectedPlant);
      },

      error: (error: HttpErrorResponse) => {

        console.error(
          'My Plants checking error:',
          error
        );

        this.adding.set(false);

        if (error.status === 401) {

          this.addMessage.set(
            'Please sign in to add plants.'
          );

        } else if (error.status === 0) {

          this.addMessage.set(
            'Cannot connect to GHARSA.API.'
          );

        } else {

          this.addMessage.set(
            'Unable to check your plant collection.'
          );
        }
      }

    });
  }

  // =========================
  // CREATE MY PLANT
  // =========================

  private createMyPlant(plant: PlantInfo): void {

    const request = {
      plantId: plant.plantId,
      nickname: plant.name
    };

    this.http.post(
      `${this.apiBase}/MyPlants`,
      request
    ).subscribe({

      next: () => {

        this.adding.set(false);
        this.addSuccess.set(true);

        this.addMessage.set(
          'Plant added to your collection!'
        );
      },

      error: (error: HttpErrorResponse) => {

        console.error(
          'Add plant error:',
          error
        );

        this.adding.set(false);
        this.addSuccess.set(false);

        if (error.status === 401) {

          this.addMessage.set(
            'Please sign in to add plants.'
          );

        } else if (error.status === 409) {

          this.addMessage.set(
            'This plant is already in your collection.'
          );

        } else if (error.status === 400) {

          this.addMessage.set(
            'Invalid plant information.'
          );

        } else if (error.status === 0) {

          this.addMessage.set(
            'Cannot connect to GHARSA.API.'
          );

        } else {

          this.addMessage.set(
            'Unable to add this plant. Please try again.'
          );
        }
      }

    });
  }

  // =========================
  // IMAGE ERROR
  // =========================

  onImageError(): void {

    this.imageError.set(true);
  }

}
