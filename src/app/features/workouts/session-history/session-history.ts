import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../../shared/components/badge/badge';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { StarRating } from '../../../shared/components/star-rating/star-rating';

import { WorkoutsService } from '../services/workouts.service';

type RangeFilter = 'week' | 'month' | 'all';

@Component({
  selector: 'app-session-history',
  imports: [RouterLink, SectionCard, StarRating, Badge],
  templateUrl: './session-history.html',
  styleUrl: './session-history.scss',
})
export class SessionHistory {
  private readonly ws = inject(WorkoutsService);
  readonly history = this.ws.getSessionHistory();
  readonly schedule = this.ws.getWeeklySchedule();

  readonly selectedDayLabel = signal<string | null>(null);

  readonly selectedDay = computed(
    () => this.schedule().find((d) => d.dayLabel === this.selectedDayLabel()) ?? null,
  );

  readonly selectedRoutine = computed(() => {
    const day = this.selectedDay();
    if (!day?.routine) return null;
    return this.ws.getRoutineById(day.routine.id)();
  });

  toggleDay(dayLabel: string): void {
    this.selectedDayLabel.set(this.selectedDayLabel() === dayLabel ? null : dayLabel);
  }

  readonly rangeFilter = signal<RangeFilter>('week');

  readonly filtered = computed(() => {
    const range = this.rangeFilter();
    return this.history().filter((s) => {
      if (range === 'week') return s.daysAgo <= 7;
      if (range === 'month') return s.daysAgo <= 30;
      return true;
    });
  });

  readonly kpis = computed(() => {
    const sessions = this.filtered();
    const totalVol = sessions.reduce((a, s) => a + s.totalVolume, 0);
    return [
      { label: 'Sesiones', value: sessions.length, unit: '', hint: '', tone: 'primary' as const },
      { label: 'Volumen total', value: totalVol, unit: 'kg', hint: '', tone: 'stars' as const },
      { label: 'Racha actual', value: 14, unit: 'días', hint: '', tone: 'info' as const },
    ];
  });

  readonly ranges: { label: string; value: RangeFilter }[] = [
    { label: 'Esta semana', value: 'week' },
    { label: 'Este mes', value: 'month' },
    { label: 'Todo', value: 'all' },
  ];

  daysAgoLabel(days: number): string {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }

  dayNumber(date: Date): number {
    return date.getDate();
  }
}
