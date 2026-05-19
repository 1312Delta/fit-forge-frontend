export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  goalType: GoalType | null;
  activityLevel: string | null;
  role: 'ROLE_USER' | 'ROLE_ADMIN';
  assignedRoutineId: number | null;
  assignedDietId: number | null;
  dailyProteinG: number | null;
  dailyCarbsG: number | null;
  dailyFatG: number | null;
  dailyKcal: number | null;
  bodyFatPercent: number | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  nutritionCalculatedAt: string | null;
  createdAt: string;
}

export type GoalType = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance';
