import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BadgeVariant } from '../../../shared/components/badge/badge';
import {
  Exercise,
  ExerciseDetail,
  ExerciseProgress,
  ProgressKpi,
  Routine,
  RoutineDetail,
  RoutineExercise,
  ScheduledDay,
  SessionHistoryItem,
  SessionSummaryData,
  ActiveExercise,
} from '../models/workouts.models';

// ── API response shapes ──────────────────────────────────────────────────────

interface ApiExercise {
  id: number;
  name: string;
  description: string;
  muscleGroup: string;
  equipment: string;
  caloriesPerMin: string;
}

interface ApiExerciseDetail extends ApiExercise {
  personalRecords: {
    sessionCount: number;
    maxWeightKg: number;
    maxReps: number;
    maxVolumeKgInSingleSet: number;
    lastPerformedAt: string | null;
  };
  history: {
    sessionId: number;
    performedAt: string;
    sets: { setNumber: number; reps: number; weightKg: string }[];
  }[];
}

interface ApiWorkoutDetail {
  id: number;
  startedAt: string;
  durationMin: number;
  generalFeeling: string;
  notes: string | null;
  routine: { id: number; name: string } | null;
  totals: { exerciseCount: number; setCount: number; repCount: number; volumeKg: number };
  exercises: {
    id: number;
    orderIndex: number;
    enjoyment: number | null;
    difficulty: number | null;
    exercise: { id: number; name: string; muscleGroup: string };
    sets: { setNumber: number; reps: number; weightKg: string }[];
  }[];
}

interface ApiStats {
  totals: {
    sessionCount: number;
    totalMinutes: number;
    trainingDays: number;
    setCount: number;
    repCount: number;
    volumeKg: number;
  };
  personalRecords: {
    exercise: { id: number; name: string; muscleGroup: string; equipment: string };
    sessionCount: number;
    maxWeightKg: number;
    maxReps: number;
    maxVolumeKgInSingleSet: number;
    lastPerformedAt: string | null;
  }[];
  progressByExercise: {
    exercise: { id: number; name: string; muscleGroup: string; equipment: string };
    points: {
      sessionId: number;
      performedAt: string;
      maxWeightKg: number;
      maxReps: number;
      volumeKg: number;
    }[];
  }[];
}

interface ApiRoutine {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  goalType: string;
  exercises?: ApiRoutineExercise[];
}

interface ApiRoutineExercise {
  id: number;
  exercise: { id: number; name: string; muscleGroup?: string };
  sets: number;
  reps: number;
  orderIndex: number;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function difficultyToBadge(difficulty: string): BadgeVariant {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
    case 'easy':
      return 'easy';
    case 'advanced':
    case 'hard':
      return 'hard';
    default:
      return 'mid';
  }
}

function goalTypeToCategory(goalType: string): string {
  switch (goalType?.toLowerCase()) {
    case 'muscle_gain':
      return 'Hipertrofia';
    case 'weight_loss':
      return 'Cardio';
    case 'strength':
      return 'Fuerza';
    case 'endurance':
      return 'Resistencia';
    case 'flexibility':
      return 'Movilidad';
    default:
      return 'General';
  }
}

function muscleGroupToLocal(group: string): Exercise['muscleGroup'] {
  const map: Record<string, Exercise['muscleGroup']> = {
    chest: 'pecho',
    back: 'espalda',
    shoulders: 'hombros',
    biceps: 'biceps',
    triceps: 'triceps',
    legs: 'piernas',
    core: 'abdomen',
    abs: 'abdomen',
    cardio: 'cardio',
  };
  return map[group?.toLowerCase()] ?? 'pecho';
}

function apiExerciseToExercise(e: ApiExercise): Exercise {
  return {
    id: e.id.toString(),
    name: e.name,
    muscleGroup: muscleGroupToLocal(e.muscleGroup),
    equipment: e.equipment,
    difficulty: 'mid',
    avgRating: 0,
  };
}

function apiExerciseDetailToExerciseDetail(e: ApiExerciseDetail): ExerciseDetail {
  return {
    id: e.id.toString(),
    name: e.name,
    muscleGroup: muscleGroupToLocal(e.muscleGroup),
    equipment: e.equipment,
    difficulty: 'mid',
    avgRating: 0,
    instructions: e.description ? [e.description] : [],
    tips: [],
    ratingCount: e.personalRecords.sessionCount,
    history: e.history.flatMap((h) =>
      h.sets.map((s) => ({
        date: new Date(h.performedAt).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        sets: h.sets.length,
        reps: s.reps,
        weight: `${s.weightKg} kg`,
      })),
    ),
  };
}

function feelingToRating(feeling: string): number {
  switch (feeling) {
    case 'great':
      return 5;
    case 'good':
      return 4;
    case 'regular':
      return 3;
    default:
      return 2;
  }
}

function apiWorkoutDetailToSummary(w: ApiWorkoutDetail): SessionSummaryData {
  return {
    id: w.id.toString(),
    routineName: w.routine?.name ?? 'Sesión libre',
    date: new Date(w.startedAt).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    durationMin: w.durationMin ?? 0,
    totalVolume: w.totals.volumeKg,
    exercises: w.exercises.map((ex) => ({
      exerciseId: ex.exercise.id.toString(),
      name: ex.exercise.name,
      rating: ex.enjoyment ?? 0,
      difficulty: difficultyToBadge(ex.difficulty?.toString() ?? ''),
      difficultyLabel:
        ex.difficulty != null && ex.difficulty >= 4
          ? 'Duro'
          : ex.difficulty != null && ex.difficulty >= 2
            ? 'Medio'
            : 'Fácil',
      sets: ex.sets.map((s) => ({
        setNumber: s.setNumber,
        reps: s.reps,
        weight: `${s.weightKg} kg`,
      })),
    })),
    personalBests: [],
  };
}

function apiRoutineToRoutine(r: ApiRoutine): Routine {
  return {
    id: r.id.toString(),
    name: r.name,
    level: difficultyToBadge(r.difficulty),
    category: goalTypeToCategory(r.goalType),
    daysPerWeek: 3,
    durationMin: 60,
    description: r.description ?? '',
    exerciseCount: r.exercises?.length ?? 0,
  };
}

function apiRoutineToDetail(r: ApiRoutine): RoutineDetail {
  const exercises: RoutineExercise[] = (r.exercises ?? []).map((e) => ({
    exerciseId: e.exercise.id.toString(),
    name: e.exercise.name,
    sets: e.sets,
    reps: e.reps.toString(),
    restSec: 90,
  }));
  return {
    ...apiRoutineToRoutine(r),
    exerciseCount: exercises.length,
    exercises,
    author: 'FitForge Team',
    lastUpdated: new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class WorkoutsService {
  private readonly http = inject(HttpClient);
  private sessionHistorySig = signal<SessionHistoryItem[]>([]);
  private routinesSig = signal<Routine[]>([]);
  private routineDetailCache = new Map<string, ReturnType<typeof signal<RoutineDetail>>>();
  private sessionSummaryCache = new Map<string, ReturnType<typeof signal<SessionSummaryData>>>();

  constructor() {
    this.loadSessionHistory();
    this.loadRoutines();
  }

  private loadRoutines() {
    this.http
      .get<{ data: ApiRoutine[] }>(`${environment.apiUrl}/routines`)
      .pipe(
        map((res) => (res.data ?? []).map(apiRoutineToRoutine)),
        catchError((err) => {
          console.error('Error al cargar rutinas:', err);
          return of([] as Routine[]);
        }),
      )
      .subscribe((routines) => {
        console.log('[WS] getRoutines', routines);
        this.routinesSig.set(routines);
      });
  }

  getRoutines() {
    return this.routinesSig;
  }

  getRoutineById(id: string) {
    if (!this.routineDetailCache.has(id)) {
      const sig = signal<RoutineDetail>({
        id,
        name: '',
        level: 'mid',
        category: '',
        daysPerWeek: 0,
        durationMin: 0,
        description: '',
        exerciseCount: 0,
        exercises: [],
        author: '',
        lastUpdated: '',
      });
      this.routineDetailCache.set(id, sig);
      this.http
        .get<ApiRoutine>(`${environment.apiUrl}/routines/${id}`)
        .pipe(
          catchError((err) => {
            console.error(`Error al cargar rutina ${id}:`, err);
            return of(null);
          }),
        )
        .subscribe((r) => {
          console.log('[WS] getRoutineById', r);
          if (r) sig.set(apiRoutineToDetail(r));
        });
    }
    return this.routineDetailCache.get(id)!;
  }

  getExercises() {
    const sig = signal<Exercise[]>([]);
    this.http
      .get<{ data: ApiExercise[] }>(`${environment.apiUrl}/exercises?page=1&limit=100`)
      .pipe(
        map((res) => (res.data ?? []).map(apiExerciseToExercise)),
        catchError((err) => {
          console.error('Error al cargar ejercicios:', err);
          return of([] as Exercise[]);
        }),
      )
      .subscribe((exercises) => {
        console.log('[WS] getExercises', exercises);
        sig.set(exercises);
      });
    return sig;
  }

  getExerciseById(id: string) {
    const sig = signal<ExerciseDetail>({
      id,
      name: '',
      muscleGroup: 'pecho',
      equipment: '',
      difficulty: 'mid',
      avgRating: 0,
      instructions: [],
      tips: [],
      ratingCount: 0,
      history: [],
    });
    this.http
      .get<ApiExerciseDetail>(`${environment.apiUrl}/exercises/${id}?historyLimit=10`)
      .pipe(
        catchError((err) => {
          console.error(`Error al cargar ejercicio ${id}:`, err);
          return of(null);
        }),
      )
      .subscribe((r) => {
        console.log('[WS] getExerciseById', r);
        if (r) sig.set(apiExerciseDetailToExerciseDetail(r));
      });
    return sig;
  }

  getActiveSession(routineId?: string | null) {
    const empty = { routineName: '', exercises: [] as ActiveExercise[] };
    const sig = signal(empty);
    if (routineId) {
      this.http
        .get<ApiRoutine>(`${environment.apiUrl}/routines/${routineId}`)
        .pipe(catchError(() => of(null)))
        .subscribe((r) => {
          console.log('[WS] getActiveSession (routine)', r);
          if (!r) return;
          const detail = apiRoutineToDetail(r);
          sig.set({
            routineName: detail.name,
            exercises: detail.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              name: ex.name,
              muscleGroup: 'pecho' as ActiveExercise['muscleGroup'],
              targetSets: ex.sets,
              targetReps: ex.reps,
              rating: 0,
              sets: Array.from({ length: ex.sets }, (_, i) => ({
                setNumber: i + 1,
                reps: null,
                weight: '0',
                done: false,
              })),
            })),
          });
        });
    }
    return sig;
  }

  getSessionSummary(sessionId: string) {
    if (!this.sessionSummaryCache.has(sessionId)) {
      const sig = signal<SessionSummaryData>({
        id: sessionId,
        routineName: '',
        date: '',
        durationMin: 0,
        totalVolume: 0,
        exercises: [],
        personalBests: [],
      });
      this.sessionSummaryCache.set(sessionId, sig);
      this.http
        .get<ApiWorkoutDetail>(`${environment.apiUrl}/workouts/${sessionId}`)
        .pipe(
          catchError((err) => {
            console.error(`Error al cargar resumen de sesión ${sessionId}:`, err);
            return of(null);
          }),
        )
        .subscribe((r) => {
          console.log('[WS] getSessionSummary', r);
          if (r) sig.set(apiWorkoutDetailToSummary(r));
        });
    }
    return this.sessionSummaryCache.get(sessionId)!;
  }

  getSessionHistory() {
    return this.sessionHistorySig;
  }

  private loadSessionHistory() {
    this.http
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .get<{ data: any[] }>(`${environment.apiUrl}/workouts`)
      .pipe(
        catchError((err) => {
          console.error('Error al cargar historial de sesiones:', err);
          return of({ data: null });
        }),
      )
      .subscribe((res) => {
        console.log('[WS] loadSessionHistory', res);
        if (res.data) {
          const mapped: SessionHistoryItem[] = res.data.map((d) => ({
            id: d.id.toString(),
            routineName: d.routineId ? `Rutina ${d.routineId}` : 'Sesión Libre',
            date: new Date(d.startedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
            daysAgo: Math.max(
              0,
              Math.round((new Date().getTime() - new Date(d.startedAt).getTime()) / 86400000),
            ),
            durationMin: d.durationMin ?? 0,
            exerciseCount: d.exerciseCount ?? 0,
            totalVolume: 0,
            rating: feelingToRating(d.generalFeeling),
          }));
          this.sessionHistorySig.set(mapped);
        }
      });
  }

  createSession(routineId?: number, notes?: string) {
    return this.http.post<{ id: number; startedAt: string }>(`${environment.apiUrl}/workouts`, {
      routineId,
      notes,
      startedAt: new Date().toISOString(),
    });
  }

  addExerciseToSession(sessionId: number, exerciseId: number, orderIndex: number) {
    return this.http.post<{ id: number }>(`${environment.apiUrl}/workouts/${sessionId}/exercises`, {
      exerciseId,
      orderIndex,
    });
  }

  addSetToExercise(
    sessionId: number,
    sessionExerciseId: number,
    setNumber: number,
    reps: number | null,
    weightKg: string,
    rpe?: number,
  ) {
    return this.http.post<{ id: number }>(
      `${environment.apiUrl}/workouts/${sessionId}/exercises/${sessionExerciseId}/sets`,
      {
        setNumber,
        reps,
        weightKg,
        rpe,
      },
    );
  }

  rateSessionExercise(
    sessionId: number,
    sessionExerciseId: number,
    enjoyment: number,
    difficulty: number,
  ) {
    return this.http.put(
      `${environment.apiUrl}/workouts/${sessionId}/exercises/${sessionExerciseId}`,
      {
        enjoyment,
        difficulty,
      },
    );
  }

  finishSession(sessionId: number, durationMin: number, generalFeeling: string, notes?: string) {
    return this.http.put(`${environment.apiUrl}/workouts/${sessionId}/finish`, {
      durationMin,
      generalFeeling,
      notes,
    });
  }

  getProgressKpis(): ReturnType<typeof signal<ProgressKpi[]>> {
    const sig = signal<ProgressKpi[]>([
      {
        label: 'Sesiones totales',
        value: '—',
        unit: 'sesiones',
        hint: 'Cargando…',
        tone: 'primary',
      },
      { label: 'Peso máximo', value: '—', unit: 'kg', hint: 'Cargando…', tone: 'stars' },
      { label: 'Series totales', value: '—', unit: 'series', hint: 'Cargando…', tone: 'info' },
      { label: 'Volumen total', value: '—', unit: 'kg', hint: 'Cargando…', tone: 'default' },
    ]);
    this.http
      .get<ApiStats>(`${environment.apiUrl}/users/me/stats?topExercises=10`)
      .pipe(catchError(() => of(null)))
      .subscribe((r) => {
        console.log('[WS] getProgressKpis / getExerciseProgress (stats)', r);
        if (!r) return;
        const topRecord = r.personalRecords[0];
        sig.set([
          {
            label: 'Sesiones totales',
            value: r.totals.sessionCount,
            unit: 'sesiones',
            hint: `${r.totals.trainingDays} días entrenados`,
            tone: 'primary',
          },
          {
            label: 'Peso máximo',
            value: topRecord ? topRecord.maxWeightKg : '—',
            unit: 'kg',
            hint: topRecord ? topRecord.exercise.name : 'Sin datos',
            tone: 'stars',
          },
          {
            label: 'Series totales',
            value: r.totals.setCount,
            unit: 'series',
            hint: `${r.totals.repCount} repeticiones`,
            tone: 'info',
          },
          {
            label: 'Volumen total',
            value: Math.round(r.totals.volumeKg),
            unit: 'kg',
            hint: `${r.totals.totalMinutes} minutos entrenados`,
            tone: 'default',
          },
        ]);
      });
    return sig;
  }

  getWeeklySchedule(): ReturnType<typeof signal<ScheduledDay[]>> {
    const sig = signal<ScheduledDay[]>(this.buildWeek(null));

    this.http
      .get<ApiRoutine>(`${environment.apiUrl}/users/me/routine`)
      .pipe(catchError(() => of(null)))
      .subscribe((r) => {
        console.log('[WS] getWeeklySchedule (my routine)', r);
        sig.set(this.buildWeek(r ? { id: r.id.toString(), name: r.name } : null));
      });

    return sig;
  }

  private buildWeek(activeRoutine: { id: string; name: string } | null): ScheduledDay[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Días completados a partir del historial real
    const completedDaysAgo = new Set(this.sessionHistorySig().map((s) => s.daysAgo));

    return dayLabels.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const isoDay = (i + 1) % 7;
      const jsDay = isoDay === 0 ? 0 : isoDay;
      // Si hay rutina asignada, todos los días laborables (Lun-Vie) son de entrenamiento
      const isTraining = activeRoutine !== null && jsDay >= 1 && jsDay <= 5;

      const diffMs = today.getTime() - date.getTime();
      const daysAgo = Math.round(diffMs / 86_400_000);
      const isPast = daysAgo > 0;
      const completed = isTraining && isPast && completedDaysAgo.has(daysAgo);

      return {
        dayLabel: label,
        date,
        routine: isTraining ? activeRoutine : null,
        isToday: date.getTime() === today.getTime(),
        isRest: !isTraining,
        completed,
      };
    });
  }

  getExerciseProgress(): ReturnType<typeof signal<ExerciseProgress[]>> {
    const sig = signal<ExerciseProgress[]>([]);
    this.http
      .get<ApiStats>(`${environment.apiUrl}/users/me/stats?topExercises=10`)
      .pipe(catchError(() => of(null)))
      .subscribe((r) => {
        if (!r) return;
        sig.set(
          r.progressByExercise.map((p) => {
            const sorted = [...p.points].sort(
              (a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime(),
            );
            return {
              exerciseId: p.exercise.id.toString(),
              name: p.exercise.name,
              initialWeight: sorted[0]?.maxWeightKg ?? 0,
              currentWeight: sorted[sorted.length - 1]?.maxWeightKg ?? 0,
              records: sorted.map((pt) => ({
                date: new Date(pt.performedAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                }),
                weight: pt.maxWeightKg,
                reps: pt.maxReps,
              })),
            };
          }),
        );
      });
    return sig;
  }
}
