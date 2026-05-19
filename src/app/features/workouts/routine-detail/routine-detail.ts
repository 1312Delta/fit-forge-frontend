import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Badge } from '../../../shared/components/badge/badge';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { StatTile } from '../../../shared/components/stat-tile/stat-tile';
import { WorkoutsService } from '../services/workouts.service';

const DAYS: { label: string; key: string }[] = [
  { label: 'Lunes', key: 'monday' },
  { label: 'Martes', key: 'tuesday' },
  { label: 'Miércoles', key: 'wednesday' },
  { label: 'Jueves', key: 'thursday' },
  { label: 'Viernes', key: 'friday' },
  { label: 'Sábado', key: 'saturday' },
  { label: 'Domingo', key: 'sunday' },
];

@Component({
  selector: 'app-routine-detail',
  imports: [RouterLink, Badge, SectionCard, StatTile],
  templateUrl: './routine-detail.html',
  styleUrl: './routine-detail.scss',
})
export class RoutineDetail {
  private readonly ws = inject(WorkoutsService);
  private readonly route = inject(ActivatedRoute);

  readonly id = this.route.snapshot.paramMap.get('id') ?? '1';
  readonly routine = this.ws.getRoutineById(this.id);

  readonly days = DAYS;
  readonly showDayPicker = signal(false);
  readonly saving = signal(false);
  readonly toast = signal<string | null>(null);

  readonly assignedDays = computed(() => {
    const routineId = parseInt(this.id, 10);
    return new Set(
      this.ws
        .getWeeklySchedule()()
        .filter((d) => Number(d.routine?.id) === routineId)
        .map((d) => d.dayKey),
    );
  });

  isAssigned(key: string) {
    return this.assignedDays().has(key);
  }

  toggleDay(key: string) {
    this.saving.set(true);
    const wasAssigned = this.isAssigned(key);
    const action = wasAssigned
      ? this.ws.clearDaySchedule(key)
      : this.ws.assignRoutineToDay(parseInt(this.id, 10), key, this.routine().name);

    action.subscribe({
      next: () => {
        this.showToast(wasAssigned ? 'Día desasignado' : 'Rutina asignada');
        this.saving.set(false);
      },
      error: () => {
        this.showToast('Error al guardar');
        this.saving.set(false);
      },
    });
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 3000);
  }

  levelLabel(level: string): string {
    const map: Record<string, string> = { easy: 'Fácil', mid: 'Medio', hard: 'Duro' };
    return map[level] ?? level;
  }

  formatRest(sec: number): string {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}min ${sec % 60 ? (sec % 60) + 's' : ''}`.trim();
  }
}
