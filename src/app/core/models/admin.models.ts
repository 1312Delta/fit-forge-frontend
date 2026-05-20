import { GoalType } from './user.model';

export type AdminRole = 'admin' | 'user';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AdminRole;
  goalType: GoalType | null;
  assignedRoutineId: number | null;
  assignedDietId: number | null;
  createdAt: string;
}

export interface AdminListResponse<T> {
  data: T[];
  page?: number;
  limit?: number;
  total?: number;
}

export interface AdminExercise {
  id: number;
  name: string;
  description: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  caloriesPerMin: string | number | null;
}

export interface AdminExercisePayload {
  name?: string;
  description?: string | null;
  muscleGroup?: string | null;
  equipment?: string | null;
  caloriesPerMin?: number | string | null;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface AdminRoutine {
  id: number;
  name: string;
  description: string | null;
  difficulty: Difficulty | string;
  goalType: GoalType | null;
  exerciseCount?: number;
}

export interface AdminRoutinePayload {
  name?: string;
  description?: string | null;
  difficulty?: Difficulty;
  goalType?: GoalType;
}

export interface AdminFood {
  id: number;
  name: string;
  brand: string | null;
  kcalPer100g: string | number;
  proteinG: string | number | null;
  carbsG: string | number | null;
  fatG: string | number | null;
  fiberG: string | number | null;
}

export interface AdminFoodPayload {
  name?: string;
  brand?: string | null;
  kcalPer100g?: number | string;
  proteinG?: number | string;
  carbsG?: number | string;
  fatG?: number | string;
  fiberG?: number | string;
}

export interface AdminDiet {
  id: number;
  name: string;
  description: string | null;
  dailyKcal: number | null;
  goalType: GoalType | null;
  mealCount?: number;
}

export interface AdminDietPayload {
  name?: string;
  description?: string | null;
  dailyKcal?: number | null;
  goalType?: GoalType;
}

export interface AdminRoutineExercisePayload {
  exerciseId: number;
  sets?: number | null;
  reps?: number | null;
  orderIndex?: number;
}

export interface AdminRoutineExerciseCreated {
  id: number;
  exerciseId: number;
  sets: number | null;
  reps: number | null;
  orderIndex: number;
}

export interface AdminMealPayload {
  name: string;
  mealTime?: string;
  dayOfWeek?: number;
}

export interface AdminMealCreated {
  id: number;
  name: string;
  mealTime: string | null;
  dayOfWeek: number | null;
}

export interface AdminMealFoodPayload {
  foodId: number;
  quantityG: number | string;
}

export interface AdminMealFoodCreated {
  id: number;
  foodId: number;
  quantityG: string;
}
