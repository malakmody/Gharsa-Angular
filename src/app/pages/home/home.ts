
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { DatePipe } from '@angular/common';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth';

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
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  private http = inject(HttpClient);
  auth = inject(AuthService);

  private apiUrl =
    'https://localhost:7165/api/MyPlants';

  myPlants = signal<MyPlantItem[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  totalPlants = computed(() =>
    this.myPlants().length
  );

  wateredPlants = computed(() =>
    this.myPlants().filter(
      plant => !!plant.lastWateredAt
    ).length
  );

  recentPlants = computed(() =>
    [...this.myPlants()].slice(0, 3)
  );

  userName = computed(() => {
    const name = this.auth.currentUser()?.fullName;

    if (!name) {
      return 'Plant Lover';
    }

    return name.trim().split(/\s+/)[0];
  });

  ngOnInit(): void {
    this.loadMyPlants();
  }

  loadMyPlants(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.http.get<MyPlantItem[]>(this.apiUrl)
      .subscribe({
        next: (data) => {
          this.myPlants.set(
            Array.isArray(data) ? data : []
          );

          this.loading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            'Failed to load plants:',
            error
          );

          this.errorMessage.set(
            'We could not load your plants right now.'
          );

          this.loading.set(false);
        }
      });
  }

  getDisplayName(plant: MyPlantItem): string {
    return (
      plant.nickname?.trim() ||
      plant.plantName?.trim() ||
      'My Plant'
    );
  }

  trackPlant(
    index: number,
    plant: MyPlantItem
  ): number {
    return plant.myPlantId;
  }
}
