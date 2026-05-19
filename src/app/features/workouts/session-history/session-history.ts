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
  readonly routines = this.ws.getRoutines();

  readonly selectedDayLabel = signal<string | null>(null);
  readonly showRoutinePicker = signal(false);
  readonly previewRoutineId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly toast = signal<string | null>(null);

  readonly selectedDay = computed(
    () => this.schedule().find((d) => d.dayLabel === this.selectedDayLabel()) ?? null,
  );

  readonly selectedRoutine = computed(() => {
    const day = this.selectedDay();
    if (!day?.routine) return null;
    return this.ws.getRoutineById(day.routine.id)();
  });

  toggleDay(dayLabel: string): void {
    const closing = this.selectedDayLabel() === dayLabel;
    this.selectedDayLabel.set(closing ? null : dayLabel);
    this.showRoutinePicker.set(false);
    this.previewRoutineId.set(null);
  }

  openRoutinePicker(): void {
    this.showRoutinePicker.set(!this.showRoutinePicker());
    this.previewRoutineId.set(null);
    // Precarga todos los detalles para que estén en caché al expandir
    for (const r of this.routines()) {
      this.ws.getRoutineById(r.id);
    }
  }

  selectPreview(routineId: string): void {
    this.previewRoutineId.set(this.previewRoutineId() === routineId ? null : routineId);
  }

  routineDetail(id: string) {
    return this.ws.getRoutineById(id);
  }

  assignRoutine(routineId: string, routineName: string): void {
    const day = this.selectedDay();
    if (!day) return;
    this.saving.set(true);
    this.ws.assignRoutineToDay(parseInt(routineId, 10), day.dayKey, routineName).subscribe({
      next: () => {
        this.showRoutinePicker.set(false);
        this.previewRoutineId.set(null);
        this.saving.set(false);
        this.showToast('Rutina asignada');
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Error al asignar');
      },
    });
  }

  clearRoutine(): void {
    const day = this.selectedDay();
    if (!day) return;
    this.saving.set(true);
    this.ws.clearDaySchedule(day.dayKey).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast('Día liberado');
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Error al quitar rutina');
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 3000);
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
