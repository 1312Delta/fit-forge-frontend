import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BadgeVariant } from '../../shared/components';
import {
  AiRecommendation,
  DailyMacros,
  GreetingData,
  KpiItem,
  PlanInfo,
  RecentSession,
  SessionExercise,
  WeeklyActivity,
  WeeklyDay,
} from '../models/dashboard.models';
import { User } from '../models/user.model';

interface DietFood {
  id: number;
  food: {
    id: number;
    name: string;
    kcalPer100g: number | string | null;
    proteinG: number | string | null;
    carbsG: number | string | null;
    fatG: number | string | null;
  };
  quantityG: number | string;
}
interface DietMeal {
  id: number;
  name: string;
  dayOfWeek: number | null;
  foods: DietFood[];
}
interface DietDetail {
  id: number;
  name: string;
  dailyKcal: number | null;
  meals: DietMeal[];
}
interface DietLogSummary {
  id: number;
  loggedAt: string;
}
interface DietLogDetail {
  id: number;
  mealLogs: { id: number; mealId: number }[];
}
interface ScheduleResponse {
  data: Record<string, { routineId: number; name: string; completed: boolean } | null>;
}
interface WorkoutListItem {
  id: number;
  startedAt: string;
  routineId: number | null;
}
interface WorkoutListResponse {
  data: WorkoutListItem[];
  total: number;
}
interface WorkoutDetail {
  id: number;
  startedAt: string;
  routine: { id: number; name: string } | null;
  exercises: {
    id: number;
    difficulty: number | null;
    enjoyment: number | null;
    exercise: { id: number; name: string } | null;
    sets: { setNumber: number; reps: number | null; weightKg: number | string | null }[];
  }[];
}
interface UserStats {
  totals: {
    sessionCount: number;
    totalMinutes: number;
    trainingDays: number;
    setCount: number;
    repCount: number;
    volumeKg: number;
  };
}
interface MyRoutine {
  id: number;
  name: string;
  difficulty: string | null;
}

const DAY_LABELS: { key: string; label: string }[] = [
  { key: 'monday', label: 'L' },
  { key: 'tuesday', label: 'M' },
  { key: 'wednesday', label: 'X' },
  { key: 'thursday', label: 'J' },
  { key: 'friday', label: 'V' },
  { key: 'saturday', label: 'S' },
  { key: 'sunday', label: 'D' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ── Signals exposed to the dashboard page ────────────────────────────
  private greetingSig = signal<GreetingData>({
    userName: 'Cargando...',
    dateLabel: this.buildDateLabel(),
    weekNumber: this.currentWeekNumber(),
  });

  private kpisSig = signal<KpiItem[]>([
    { label: 'Peso actual', value: '--', unit: 'kg', hint: 'Cargando…', tone: 'default' },
    { label: 'Kcal hoy', value: '--', unit: 'kcal', hint: 'Cargando…', tone: 'default' },
    { label: 'Sesiones totales', value: '--', unit: '', hint: 'Cargando…', tone: 'default' },
    { label: 'Adherencia', value: '--', unit: '%', hint: 'Cargando…', tone: 'primary' },
  ]);

  private weeklySig = signal<WeeklyActivity>({
    days: [],
    completedCount: 0,
    totalCount: 0,
    changePercent: 0,
  });

  private macrosSig = signal<DailyMacros>({
    macros: [
      { name: 'Proteína', current: 0, target: 0, unit: 'g', color: 'primary' },
      { name: 'Carbohidratos', current: 0, target: 0, unit: 'g', color: 'stars' },
      { name: 'Grasas', current: 0, target: 0, unit: 'g', color: 'danger' },
    ],
    caloriesConsumed: 0,
    caloriesTarget: 0,
  });

  private sessionSig = signal<RecentSession>({
    id: 0,
    name: 'Sin sesiones registradas',
    exercises: [],
  });

  private recommendationsSig = signal<AiRecommendation[]>([
    { icon: '🤖', text: 'Esperando datos de la IA...', variant: 'ai' },
  ]);

  private planSig = signal<PlanInfo>({
    routineName: 'Sin rutina',
    routineLevel: '-',
    dietName: 'Sin dieta',
    dietCalories: 0,
  });

  constructor() {
    this.loadAll();
  }

  // ── Public accessors ─────────────────────────────────────────────────
  getGreeting() {
    return this.greetingSig;
  }
  getKpis() {
    return this.kpisSig;
  }
  getWeeklyActivity() {
    return this.weeklySig;
  }
  getDailyMacros() {
    return this.macrosSig;
  }
  getLastSession() {
    return this.sessionSig;
  }
  getRecommendations() {
    return this.recommendationsSig;
  }
  getActivePlan() {
    return this.planSig;
  }

  // ── Loading orchestration ────────────────────────────────────────────
  private loadAll(): void {
    this.http
      .get<User>(`${this.apiUrl}/users/me`)
      .pipe(
        map((u) => this.normalizeUser(u)),
        catchError(() => of(null)),
      )
      .subscribe((user) => {
        if (!user) return;
        this.applyUserToGreetingAndKpis(user);
        this.loadStats();
        this.loadWeeklyAndAdherence();
        this.loadMacros(user);
        this.loadLastSession();
        this.loadPlan(user);
      });
  }

  // ── Greeting + first two KPIs from /users/me ─────────────────────────
  private applyUserToGreetingAndKpis(user: User): void {
    this.greetingSig.update((g) => ({
      ...g,
      userName: user.firstName || user.username,
    }));

    this.kpisSig.update((kpis) => {
      const next = [...kpis];
      next[0] = {
        ...next[0],
        value: user.currentWeightKg ?? '--',
        hint: user.currentWeightKg !== null ? 'Último pesaje' : 'Sin registrar',
      };
      next[1] = {
        ...next[1],
        value: user.dailyKcal ?? '--',
        hint: user.dailyKcal !== null ? 'Objetivo diario' : 'Configura tu nutrición',
      };
      return next;
    });
  }

  // ── KPI 3: total sessions from /users/me/stats ───────────────────────
  private loadStats(): void {
    this.http
      .get<UserStats>(`${this.apiUrl}/users/me/stats?topExercises=1`)
      .pipe(catchError(() => of(null)))
      .subscribe((stats) => {
        if (!stats) return;
        this.kpisSig.update((kpis) => {
          const next = [...kpis];
          next[2] = {
            ...next[2],
            value: stats.totals.sessionCount,
            hint: `${stats.totals.trainingDays} días entrenados`,
          };
          return next;
        });
      });
  }

  // ── Weekly activity chart + adherence KPI from /users/me/schedule ────
  private loadWeeklyAndAdherence(): void {
    this.http
      .get<ScheduleResponse>(`${this.apiUrl}/users/me/schedule`)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) return;
        const days: WeeklyDay[] = DAY_LABELS.map(({ key, label }) => {
          const entry = res.data[key];
          if (!entry) {
            return { day: label, percent: 0, completed: false };
          }
          return {
            day: label,
            percent: entry.completed ? 100 : 30,
            completed: entry.completed,
          };
        });
        const totalCount = Object.values(res.data).filter(Boolean).length;
        const completedCount = days.filter((d) => d.completed).length;
        const adherence = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

        this.weeklySig.set({
          days,
          completedCount,
          totalCount,
          changePercent: 0,
        });
        this.kpisSig.update((kpis) => {
          const next = [...kpis];
          next[3] = {
            ...next[3],
            value: adherence,
            hint: totalCount === 0 ? 'Sin plan semanal' : `${completedCount}/${totalCount} días`,
          };
          return next;
        });
      });
  }

  // ── Daily macros: assigned diet + today's diet log ───────────────────
  private loadMacros(user: User): void {
    const fallbackTargets = (): void => {
      this.macrosSig.update((m) => ({
        ...m,
        caloriesTarget: user.dailyKcal ?? 0,
        macros: [
          {
            name: 'Proteína',
            current: 0,
            target: user.dailyProteinG ?? 0,
            unit: 'g',
            color: 'primary',
          },
          {
            name: 'Carbohidratos',
            current: 0,
            target: user.dailyCarbsG ?? 0,
            unit: 'g',
            color: 'stars',
          },
          { name: 'Grasas', current: 0, target: user.dailyFatG ?? 0, unit: 'g', color: 'danger' },
        ],
      }));
    };

    if (!user.assignedDietId) {
      fallbackTargets();
      return;
    }

    forkJoin({
      diet: this.http
        .get<DietDetail>(`${this.apiUrl}/diets/${user.assignedDietId}`)
        .pipe(catchError(() => of(null))),
      logs: this.http
        .get<{ data: DietLogSummary[] }>(`${this.apiUrl}/diet-logs?page=1&limit=20`)
        .pipe(
          map((r) => r.data ?? []),
          catchError(() => of([] as DietLogSummary[])),
        ),
    })
      .pipe(
        switchMap(({ diet, logs }) => {
          const today = this.todayIso();
          const todayLog = logs.find((l) => l.loggedAt === today);
          if (!todayLog) return of({ diet, mealLogs: [] as { id: number; mealId: number }[] });
          return this.http.get<DietLogDetail>(`${this.apiUrl}/diet-logs/${todayLog.id}`).pipe(
            map((d) => ({ diet, mealLogs: d.mealLogs ?? [] })),
            catchError(() => of({ diet, mealLogs: [] as { id: number; mealId: number }[] })),
          );
        }),
      )
      .subscribe(({ diet, mealLogs }) => {
        if (!diet) {
          fallbackTargets();
          this.planSig.update((p) => ({ ...p, dietName: 'Sin dieta', dietCalories: 0 }));
          return;
        }
        const todayDay = this.todayDayOfWeek();
        const todaysMeals = diet.meals.filter((m) => m.dayOfWeek === todayDay);
        const mealsToUse = todaysMeals.length > 0 ? todaysMeals : diet.meals;

        const totalTargets = this.sumMealMacros(mealsToUse);
        const completedMealIds = new Set(mealLogs.map((ml) => ml.mealId));
        const consumed = this.sumMealMacros(mealsToUse.filter((m) => completedMealIds.has(m.id)));

        this.macrosSig.set({
          caloriesConsumed: Math.round(consumed.kcal),
          caloriesTarget: Math.round(totalTargets.kcal) || user.dailyKcal || 0,
          macros: [
            {
              name: 'Proteína',
              current: Math.round(consumed.protein),
              target: Math.round(totalTargets.protein) || user.dailyProteinG || 0,
              unit: 'g',
              color: 'primary',
            },
            {
              name: 'Carbohidratos',
              current: Math.round(consumed.carbs),
              target: Math.round(totalTargets.carbs) || user.dailyCarbsG || 0,
              unit: 'g',
              color: 'stars',
            },
            {
              name: 'Grasas',
              current: Math.round(consumed.fat),
              target: Math.round(totalTargets.fat) || user.dailyFatG || 0,
              unit: 'g',
              color: 'danger',
            },
          ],
        });

        this.planSig.update((p) => ({
          ...p,
          dietName: diet.name,
          dietCalories: Math.round(totalTargets.kcal) || diet.dailyKcal || 0,
        }));
      });
  }

  // ── Last session card ────────────────────────────────────────────────
  private loadLastSession(): void {
    this.http
      .get<WorkoutListResponse>(`${this.apiUrl}/workouts?page=1&limit=1`)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res || res.data.length === 0) return;
        const last = res.data[0];
        this.fetchSessionDetail(last.id);
      });
  }

  private fetchSessionDetail(id: number): void {
    this.http
      .get<WorkoutDetail>(`${this.apiUrl}/workouts/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe((session) => {
        if (!session) return;
        const exercises: SessionExercise[] = session.exercises.map((se) => {
          const reps = se.sets.reduce((s, x) => s + (x.reps ?? 0), 0);
          const maxWeight = se.sets.reduce((max, x) => {
            const w = this.toNum(x.weightKg) ?? 0;
            return w > max ? w : max;
          }, 0);
          const difficulty = this.mapDifficultyToBadge(se.difficulty);
          return {
            name: se.exercise?.name ?? 'Ejercicio',
            sets: se.sets.length,
            reps,
            weight: maxWeight > 0 ? `${maxWeight} kg` : '—',
            rating: se.enjoyment ?? 0,
            difficulty,
            difficultyLabel: this.difficultyLabel(difficulty),
          };
        });

        const sessionName = session.routine?.name
          ? session.routine.name
          : `Sesión ${this.formatShortDate(session.startedAt)}`;

        this.sessionSig.set({
          id: session.id,
          name: sessionName,
          exercises,
        });
      });
  }

  // ── Plan card: assigned routine (diet already set by loadMacros) ─────
  private loadPlan(user: User): void {
    if (!user.assignedRoutineId) {
      this.planSig.update((p) => ({ ...p, routineName: 'Sin rutina', routineLevel: '-' }));
      return;
    }
    this.http
      .get<MyRoutine>(`${this.apiUrl}/users/me/routine`)
      .pipe(catchError(() => of(null)))
      .subscribe((routine) => {
        if (!routine) return;
        this.planSig.update((p) => ({
          ...p,
          routineName: routine.name,
          routineLevel: routine.difficulty
            ? (DIFFICULTY_LABELS[routine.difficulty] ?? routine.difficulty)
            : '-',
        }));
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private buildDateLabel(): string {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const txt = new Date().toLocaleDateString('es-ES', opts);
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  private currentWeekNumber(): number {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
    return Math.ceil((diffDays + start.getDay() + 1) / 7);
  }

  private todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  private todayDayOfWeek(): number {
    const d = new Date().getDay(); // 0=Sun..6=Sat
    return d === 0 ? 7 : d;
  }

  private toNum(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeUser(u: User): User {
    return {
      ...u,
      heightCm: this.toNum(u.heightCm),
      currentWeightKg: this.toNum(u.currentWeightKg),
      dailyKcal: this.toNum(u.dailyKcal),
      dailyProteinG: this.toNum(u.dailyProteinG),
      dailyCarbsG: this.toNum(u.dailyCarbsG),
      dailyFatG: this.toNum(u.dailyFatG),
      bodyFatPercent: this.toNum(u.bodyFatPercent),
      bmi: this.toNum(u.bmi),
      bmr: this.toNum(u.bmr),
      tdee: this.toNum(u.tdee),
    };
  }

  private sumMealMacros(meals: DietMeal[]): {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return meals.reduce(
      (acc, m) => {
        for (const mf of m.foods) {
          const q = (this.toNum(mf.quantityG) ?? 0) / 100;
          acc.kcal += (this.toNum(mf.food.kcalPer100g) ?? 0) * q;
          acc.protein += (this.toNum(mf.food.proteinG) ?? 0) * q;
          acc.carbs += (this.toNum(mf.food.carbsG) ?? 0) * q;
          acc.fat += (this.toNum(mf.food.fatG) ?? 0) * q;
        }
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }

  private mapDifficultyToBadge(d: number | null): BadgeVariant {
    if (d === null) return 'neutral';
    if (d <= 2) return 'easy';
    if (d === 3) return 'mid';
    return 'hard';
  }

  private difficultyLabel(variant: BadgeVariant): string {
    if (variant === 'easy') return 'Fácil';
    if (variant === 'mid') return 'Medio';
    if (variant === 'hard') return 'Duro';
    return '';
  }

  private formatShortDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}
