export type GoalType = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance';

export interface DietListItem {
  id: number;
  name: string;
  description: string | null;
  dailyKcal: number | null;
  goalType: GoalType | null;
  mealCount: number;
  assigned?: boolean;
}

export interface FoodDetail {
  id: number;
  name: string;
  brand: string | null;
  kcalPer100g: number | null;
  proteinG: number | null; // per 100g
  carbsG: number | null; // per 100g
  fatG: number | null; // per 100g
  fiberG: number | null; // per 100g
}

export interface MealFoodDetail {
  id: number;
  food: FoodDetail;
  quantityG: number;
}

export interface MealDetail {
  id: number;
  name: string;
  mealTime: string | null;
  dayOfWeek: number | null;
  foods: MealFoodDetail[];
}

export interface DietDetail {
  id: number;
  name: string;
  description: string | null;
  dailyKcal: number | null;
  goalType: GoalType | null;
  meals: MealDetail[];
  assigned?: boolean;
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  weight_loss: 'Pérdida de peso',
  muscle_gain: 'Ganancia muscular',
  maintenance: 'Mantenimiento',
  endurance: 'Resistencia',
};
