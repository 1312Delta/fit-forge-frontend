import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  WeightLogEntry,
  WeightHistoryResponse,
  WeightLogPayload,
  WorkoutHistoryEntry,
  WorkoutHistoryResponse,
  WeightKpis,
  WorkoutKpis,
} from '../models/stats.models';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  // -- Signals --
  private readonly weightHistorySig = signal<WeightLogEntry[]>([]);
  readonly weightHistory = this.weightHistorySig.asReadonly();

  private readonly workoutHistorySig = signal<WorkoutHistoryEntry[]>([]);
  readonly workoutHistory = this.workoutHistorySig.asReadonly();

  readonly loading = signal<boolean>(false);

  // -- User body data --
  private readonly userHeightCmSig = signal<number | null>(null);
  readonly userHeightCm = this.userHeightCmSig.asReadonly();

  // -- Computed KPIs --
  readonly weightKpis = computed<WeightKpis>(() => {
    const history = this.weightHistory();
    if (!history.length) {
      return { currentWeight: null, totalChange: null, totalEntries: 0 };
    }

    // Sort chronological: oldest first
    const sorted = [...history].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
    );
    const first = Number(sorted[0].weightKg);
    const current = Number(sorted[sorted.length - 1].weightKg);

    return {
      currentWeight: current,
      totalChange: current - first,
      totalEntries: history.length,
    };
  });

  readonly workoutKpis = computed<WorkoutKpis>(() => {
    const history = this.workoutHistory();
    if (!history.length) {
      return {
        totalSessions: 0,
        avgDurationMin: null,
        sessionsThisWeek: 0,
        currentStreak: 0,
        feelingDistribution: { bad: 0, regular: 0, good: 0, great: 0 },
      };
    }

    const durations = history.filter((w) => w.durationMin !== null).map((w) => w.durationMin!);
    const avgDurationMin = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const sessionsThisWeek = history.filter((w) => new Date(w.startedAt) >= monday).length;

    // Streak
    const uniqueDates = [
      ...new Set(
        history.map((w) => {
          const d = new Date(w.startedAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }),
      ),
    ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const checkDate = new Date();

    const todayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

    let currentDateToCheck = new Date();
    if (uniqueDates.includes(todayStr)) {
      currentDateToCheck = new Date();
    } else if (uniqueDates.includes(yesterdayStr)) {
      currentDateToCheck = new Date();
      currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
    }

    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
      while (true) {
        const str = `${currentDateToCheck.getFullYear()}-${String(currentDateToCheck.getMonth() + 1).padStart(2, '0')}-${String(currentDateToCheck.getDate()).padStart(2, '0')}`;
        if (uniqueDates.includes(str)) {
          streak++;
          currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
        } else {
          break;
        }
      }
    }

    const feelings = { bad: 0, regular: 0, good: 0, great: 0 };
    history.forEach((w) => {
      if (w.generalFeeling) {
        feelings[w.generalFeeling] = (feelings[w.generalFeeling] || 0) + 1;
      }
    });

    return {
      totalSessions: history.length,
      avgDurationMin,
      sessionsThisWeek,
      currentStreak: streak,
      feelingDistribution: feelings,
    };
  });

  refreshAll(): void {
    this.loading.set(true);
    this.weightHistorySig.set([]);
    this.workoutHistorySig.set([]);
    this.loadAllWeightHistory(1);
    this.loadAllWorkoutHistory(1);
    this.loadUserHeight();
  }

  private loadUserHeight(): void {
    this.http
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .get<any>(`${environment.apiUrl}/users/me`)
      .subscribe({
        next: (user) => {
          if (user?.heightCm) {
            this.userHeightCmSig.set(Number(user.heightCm));
          }
        },
      });
  }

  updateUserHeight(heightCm: number): Observable<unknown> {
    return this.http.put(`${environment.apiUrl}/users/me`, { heightCm }).pipe(
      tap(() => {
        this.userHeightCmSig.set(heightCm);
      }),
    );
  }

  private getDeletedIds(): number[] {
    try {
      const stored = localStorage.getItem('fitforge_deleted_weight_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveDeletedIds(ids: number[]): void {
    localStorage.setItem('fitforge_deleted_weight_logs', JSON.stringify(ids));
  }

  deleteWeightLog(id: number): void {
    const deletedIds = this.getDeletedIds();
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      this.saveDeletedIds(deletedIds);
    }
    this.weightHistorySig.update((prev) => prev.filter((item) => item.id !== id));
  }

  private loadAllWeightHistory(page = 1): void {
    this.http
      .get<WeightHistoryResponse>(`${environment.apiUrl}/users/me/weight?page=${page}&limit=50`)
      .subscribe({
        next: (res) => {
          const deletedIds = this.getDeletedIds();
          const filtered = res.data.filter((item) => !deletedIds.includes(item.id));
          if (page === 1) {
            this.weightHistorySig.set(filtered);
          } else {
            this.weightHistorySig.update((prev) => [...prev, ...filtered]);
          }

          if (res.data.length === 50) {
            this.loadAllWeightHistory(page + 1);
          } else {
            setTimeout(() => this.loading.set(false), 300);
          }
        },
        error: () => setTimeout(() => this.loading.set(false), 300),
      });
  }

  private loadAllWorkoutHistory(page = 1): void {
    this.http
      .get<WorkoutHistoryResponse>(`${environment.apiUrl}/workouts?page=${page}&limit=50`)
      .subscribe({
        next: (res) => {
          if (page === 1) {
            this.workoutHistorySig.set(res.data);
          } else {
            this.workoutHistorySig.update((prev) => [...prev, ...res.data]);
          }
          if (res.data.length === 50) {
            this.loadAllWorkoutHistory(page + 1);
          } else {
            setTimeout(() => this.loading.set(false), 300);
          }
        },
        error: () => setTimeout(() => this.loading.set(false), 300),
      });
  }

  logWeight(payload: WeightLogPayload): Observable<WeightLogEntry> {
    return this.http.post<WeightLogEntry>(`${environment.apiUrl}/users/me/weight`, payload).pipe(
      tap((newEntry) => {
        // Ensure new logs don't clash with previously locally deleted logs
        const deletedIds = this.getDeletedIds();
        if (deletedIds.includes(newEntry.id)) {
          const updatedDeleted = deletedIds.filter((id) => id !== newEntry.id);
          this.saveDeletedIds(updatedDeleted);
        }
        this.weightHistorySig.update((prev) => [newEntry, ...prev]);
      }),
    );
  }
}
