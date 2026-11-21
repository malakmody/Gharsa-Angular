
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface MyPlantItem {
  myPlantId: number;
  plantId: number;
  nickname?: string | null;
  plantName?: string | null;
  imageUrl?: string | null;
  dateAdded?: string | null;
  lastWateredAt?: string | null;
}

@Component({
  selector: 'app-my-plants',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './my-plants.html',
  styleUrl: './my-plants.css'
})
export class MyPlants implements OnInit {

  private http = inject(HttpClient);

  private apiBase =
    'https://localhost:7165/api';

  myPlants = signal<MyPlantItem[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');

  busyPlantId = signal<number | null>(null);

  totalPlants = computed(() =>
    this.myPlants().length
  );

  wateredPlants = computed(() =>
    this.myPlants().filter(
      plant => !!plant.lastWateredAt
    ).length
  );

  ngOnInit(): void {
    this.loadPlants();
  }

  loadPlants(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.http.get<MyPlantItem[]>(
      `${this.apiBase}/MyPlants`
    ).subscribe({
      next: (data) => {
        this.myPlants.set(
          Array.isArray(data) ? data : []
        );

        this.loading.set(false);
      },

      error: (error: HttpErrorResponse) => {
        console.error(error);

        this.errorMessage.set(
          'Unable to load your plant collection.'
        );

        this.loading.set(false);
      }
    });
  }

  getPlantName(plant: MyPlantItem): string {
    return (
      plant.nickname?.trim() ||
      plant.plantName?.trim() ||
      'My Plant'
    );
  }

  recordWatering(plant: MyPlantItem): void {
    if (this.busyPlantId() !== null) {
      return;
    }

    this.busyPlantId.set(plant.myPlantId);
    this.errorMessage.set('');
    this.successMessage.set('');

    const request = {
      myPlantId: plant.myPlantId,
      taskName: 'Watering',
      completedAt: new Date().toISOString(),
      notes: 'Watered from My Plants page'
    };

    this.http.post(
      `${this.apiBase}/CareLogs`,
      request
    ).subscribe({

      next: () => {
        this.busyPlantId.set(null);

        this.successMessage.set(
          `${this.getPlantName(plant)} watered successfully!`
        );

        this.loadPlants();
      },

      error: (error: HttpErrorResponse) => {
        console.error(error);
        this.busyPlantId.set(null);

        this.errorMessage.set(
          'Could not save watering. Please try again.'
        );
      }
    });
  }

  removePlant(plant: MyPlantItem): void {
    if (this.busyPlantId() !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${this.getPlantName(plant)}" from your collection?`
    );

    if (!confirmed) {
      return;
    }

    this.busyPlantId.set(plant.myPlantId);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http.delete(
      `${this.apiBase}/MyPlants/${plant.myPlantId}`
    ).subscribe({

      next: () => {
        this.myPlants.update(items =>
          items.filter(
            item => item.myPlantId !== plant.myPlantId
          )
        );

        this.busyPlantId.set(null);

        this.successMessage.set(
          'Plant removed from your collection.'
        );
      },

      error: (error: HttpErrorResponse) => {
        console.error(error);
        this.busyPlantId.set(null);

        this.errorMessage.set(
          'Unable to remove the plant.'
        );
      }
    });
  }

  imageFailed(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
