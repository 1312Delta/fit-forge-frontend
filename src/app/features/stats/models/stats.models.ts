export interface WeightLogEntry {
  id: number;
  weightKg: string;
  loggedAt: string;
  notes: string | null;
}

export interface WeightHistoryResponse {
  data: WeightLogEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface WeightLogPayload {
  weightKg: number;
  loggedAt?: string;
  notes?: string;
}

export interface WorkoutHistoryEntry {
  id: number;
  startedAt: string;
  durationMin: number | null;
  generalFeeling: 'bad' | 'regular' | 'good' | 'great' | null;
  notes: string | null;
  routineId: number | null;
  exerciseCount: number;
}

export interface WorkoutHistoryResponse {
  data: WorkoutHistoryEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface WeightKpis {
  currentWeight: number | null;
  totalChange: number | null;
  totalEntries: number;
}

export interface WorkoutKpis {
  totalSessions: number;
  avgDurationMin: number | null;
  sessionsThisWeek: number;
  currentStreak: number;
  feelingDistribution: Record<string, number>;
}
