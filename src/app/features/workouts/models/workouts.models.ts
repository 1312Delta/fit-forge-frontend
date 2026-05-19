import { BadgeVariant } from '../../../shared/components/badge/badge';

export type MuscleGroup =
  | 'pecho'
  | 'espalda'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'piernas'
  | 'abdomen'
  | 'cardio';

// ── Rutinas ─────────────────────────────────────────────────────────────────

export interface Routine {
  id: string;
  name: string;
  level: BadgeVariant;
  category: string;
  daysPerWeek: number;
  durationMin: number;
  description: string;
  exerciseCount: number;
}

export interface RoutineExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  restSec: number;
  note?: string;
}

export interface RoutineDetail extends Routine {
  exercises: RoutineExercise[];
  author: string;
  lastUpdated: string;
}

// ── Ejercicios ───────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  difficulty: BadgeVariant;
  avgRating: number;
}

export interface ExerciseDetail extends Exercise {
  instructions: string[];
  tips: string[];
  ratingCount: number;
  history: { date: string; sets: number; reps: number; weight: string }[];
}

// ── Sesión activa ────────────────────────────────────────────────────────────

export interface ActiveSet {
  setNumber: number;
  reps: number | null;
  weight: string;
  done: boolean;
}

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
  targetReps: string;
  sets: ActiveSet[];
  rating: number;
}

// ── Resumen de sesión ────────────────────────────────────────────────────────

export interface SetLog {
  setNumber: number;
  reps: number;
  weight: string;
}

export interface ExerciseLog {
  exerciseId: string;
  name: string;
  sets: SetLog[];
  rating: number;
  difficulty: BadgeVariant;
  difficultyLabel: string;
}

export interface SessionSummaryData {
  id: string;
  routineName: string;
  date: string;
  durationMin: number;
  totalVolume: number;
  exercises: ExerciseLog[];
  personalBests: string[];
}

// ── Historial ────────────────────────────────────────────────────────────────

export interface SessionHistoryItem {
  id: string;
  routineName: string;
  date: string;
  daysAgo: number;
  durationMin: number;
  exerciseCount: number;
  totalVolume: number;
  rating: number;
}

// ── Calendario semanal ───────────────────────────────────────────────────────

export interface ScheduledDay {
  dayLabel: string;
  dayKey: string;
  date: Date;
  routine: { id: string; name: string } | null;
  isToday: boolean;
  isRest: boolean;
  completed: boolean;
}

// ── Progreso ─────────────────────────────────────────────────────────────────

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  initialWeight: number;
  currentWeight: number;
  records: { date: string; weight: number; reps: number }[];
}

export interface ProgressKpi {
  label: string;
  value: string | number;
  unit: string;
  hint: string;
  tone: 'default' | 'primary' | 'danger' | 'stars' | 'info';
}
