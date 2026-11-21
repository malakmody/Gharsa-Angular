
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

interface MyPlantItem {
  myPlantId: number;
  plantId: number;
  nickname?: string | null;
  plantName?: string | null;
  imageUrl?: string | null;
  dateAdded?: string | null;
  lastWateredAt?: string | null;
}

interface CareGuide {
  plantCareGuideId: number;
  plantId: number;
  wateringIntervalDays?: number | null;
}

interface ScheduleItem {
  myPlantId: number;
  plantId: number;
  name: string;
  imageUrl: string | null;
  lastWateredAt: string | null;
  nextWateringDate: Date | null;
  daysRemaining: number | null;
  intervalDays: number | null;
  status: 'due' | 'upcoming' | 'unscheduled';
}

@Component({
  selector: 'app-care-schedule',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './care-schedule.html',
  styleUrl: './care-schedule.css'
})
export class CareSchedule implements OnInit {

  private http = inject(HttpClient);

  private apiBase =
    'https://localhost:7165/api';

  loading = signal(true);
  errorMessage = signal('');

  schedule = signal<ScheduleItem[]>([]);

  selectedFilter = signal<
    'all' | 'due' | 'upcoming' | 'unscheduled'
  >('all');

  totalPlants = computed(() =>
    this.schedule().length
  );

  dueCount = computed(() =>
    this.schedule().filter(
      item => item.status === 'due'
    ).length
  );

  upcomingCount = computed(() =>
    this.schedule().filter(
      item => item.status === 'upcoming'
    ).length
  );

  unscheduledCount = computed(() =>
    this.schedule().filter(
      item => item.status === 'unscheduled'
    ).length
  );

  filteredSchedule = computed(() => {
    const filter = this.selectedFilter();

    if (filter === 'all') {
      return this.schedule();
    }

    return this.schedule().filter(
      item => item.status === filter
    );
  });

  ngOnInit(): void {
    this.loadSchedule();
  }

  loadSchedule(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      plants: this.http.get<MyPlantItem[]>(
        `${this.apiBase}/MyPlants`
      ),
      guides: this.http.get<CareGuide[]>(
        `${this.apiBase}/PlantCareGuides`
      )
    }).subscribe({

      next: ({ plants, guides }) => {
        const userPlants = Array.isArray(plants)
          ? plants
          : [];

        const careGuides = Array.isArray(guides)
          ? guides
          : [];

        const result = userPlants.map(plant => {
          const guide = careGuides.find(
            item => item.plantId === plant.plantId
          );

          return this.createScheduleItem(
            plant,
            guide
          );
        });

        result.sort((a, b) => {
          const order = {
            due: 0,
            upcoming: 1,
            unscheduled: 2
          };

          if (a.status !== b.status) {
            return order[a.status] - order[b.status];
          }

          return (
            (a.daysRemaining ?? 999999) -
            (b.daysRemaining ?? 999999)
          );
        });

        this.schedule.set(result);
        this.loading.set(false);
      },

      error: error => {
        console.error(
          'Care schedule loading failed:',
          error
        );

        this.errorMessage.set(
          'Unable to load your care schedule. Please check the API connection.'
        );

        this.loading.set(false);
      }
    });
  }

  private createScheduleItem(
    plant: MyPlantItem,
    guide?: CareGuide
  ): ScheduleItem {

    const interval =
      guide?.wateringIntervalDays ?? null;

    const baseDateText =
      plant.lastWateredAt ||
      plant.dateAdded ||
      null;

    const baseDate = baseDateText
      ? new Date(baseDateText)
      : null;

    let nextDate: Date | null = null;
    let daysRemaining: number | null = null;

    let status:
      'due' | 'upcoming' | 'unscheduled' =
      'unscheduled';

    if (
      interval !== null &&
      Number.isInteger(interval) &&
      interval > 0 &&
      baseDate &&
      !Number.isNaN(baseDate.getTime())
    ) {
      nextDate = new Date(baseDate);

      nextDate.setDate(
        nextDate.getDate() + interval
      );

      const today = new Date();

      today.setHours(0, 0, 0, 0);
      nextDate.setHours(0, 0, 0, 0);

      const difference =
        nextDate.getTime() - today.getTime();

      daysRemaining = Math.round(
        difference / 86400000
      );

      status = daysRemaining <= 0
        ? 'due'
        : 'upcoming';
    }

    return {
      myPlantId: plant.myPlantId,
      plantId: plant.plantId,
      name:
        plant.nickname?.trim() ||
        plant.plantName?.trim() ||
        'My Plant',
      imageUrl: plant.imageUrl ?? null,
      lastWateredAt: plant.lastWateredAt ?? null,
      nextWateringDate: nextDate,
      daysRemaining,
      intervalDays: interval,
      status
    };
  }

  setFilter(
    filter: 'all' | 'due' | 'upcoming' | 'unscheduled'
  ): void {
    this.selectedFilter.set(filter);
  }

  getStatusText(item: ScheduleItem): string {
    if (item.status === 'unscheduled') {
      return 'No schedule';
    }

    if (item.daysRemaining === null) {
      return 'Not available';
    }

    if (item.daysRemaining < 0) {
      const days = Math.abs(item.daysRemaining);

      return `${days} day${days === 1 ? '' : 's'} overdue`;
    }

    if (item.daysRemaining === 0) {
      return 'Due today';
    }

    if (item.daysRemaining === 1) {
      return 'Tomorrow';
    }

    return `In ${item.daysRemaining} days`;
  }

  imageFailed(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
