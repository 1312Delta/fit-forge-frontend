// Frontend view model for the daily nutrition screen.
// The backend exposes diet meals (/api/diets/{id}) and diet logs
// (/api/diet-logs) separately — this shape composes them for the UI.

export interface DailyMealItem {
  id: number; // meal id from the diet
  name: string;
  time: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  foods: {
    id: number;
    name: string;
    amount: string; // e.g. "150g"
    calories: number;
  }[];
  completed: boolean;
  // Local id of the MealLog created on POST /diet-logs/{id}/meals, when marked this session.
  mealLogId: number | null;
}

export interface DailyNutritionProgress {
  date: string;
  targetCalories: number;
  consumedCalories: number;
  targetProtein: number | null;
  consumedProtein: number;
  targetCarbs: number | null;
  consumedCarbs: number;
  targetFat: number | null;
  consumedFat: number;
  meals: DailyMealItem[];
}
