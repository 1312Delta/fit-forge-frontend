import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { DietService, NutritionApplyPayload } from '../services/diet.service';
import { MealService } from '../services/meal.service';
import { DailyMealItem, DailyNutritionProgress } from '../models/meal.model';
import { DietDetail, MealDetail } from '../models/diet.model';

@Component({
  selector: 'app-daily-diet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './daily-diet.html',
  styleUrls: ['./daily-diet.scss'],
})
export class DailyDiet implements OnInit {
  private readonly dietService = inject(DietService);
  private readonly mealService = inject(MealService);

  progress = signal<DailyNutritionProgress | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  noAssignedDiet = signal<boolean>(false);
  assignedDietName = signal<string | null>(null);
  assignedDietId = signal<number | null>(null);

  // Tracks the DietLog id for today (created lazily when the user marks a meal).
  private dietLogIdForToday = signal<number | null>(null);

  // Nutrition setup banner shown when the user has no daily macros yet.
  needsNutritionInput = signal<boolean>(false);
  nutritionForm = signal<{
    sex: 'male' | 'female';
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    bodyFatPercent: number | null;
  }>({ sex: 'male', activityLevel: 'moderate', bodyFatPercent: null });
  nutritionSubmitting = signal<boolean>(false);
  nutritionError = signal<string | null>(null);

  updateSex(value: 'male' | 'female'): void {
    this.nutritionForm.update((f) => ({ ...f, sex: value }));
  }
  updateActivityLevel(value: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'): void {
    this.nutritionForm.update((f) => ({ ...f, activityLevel: value }));
  }
  updateBodyFat(value: number | null): void {
    this.nutritionForm.update((f) => ({ ...f, bodyFatPercent: value }));
  }

  submitNutritionInputs(): void {
    if (this.nutritionSubmitting()) return;
    const f = this.nutritionForm();
    const payload: NutritionApplyPayload = {
      activityLevel: f.activityLevel,
    };
    if (f.bodyFatPercent !== null && f.bodyFatPercent > 0) {
      payload.bodyFatPercent = f.bodyFatPercent;
    } else {
      payload.sex = f.sex;
    }
    this.nutritionSubmitting.set(true);
    this.nutritionError.set(null);
    this.dietService.applyNutrition(payload).subscribe({
      next: () => {
        this.nutritionSubmitting.set(false);
        this.needsNutritionInput.set(false);
        this.loadDailyProgress();
      },
      error: (err) => {
        console.error('Error applying nutrition', err);
        this.nutritionSubmitting.set(false);
        this.nutritionError.set(
          err?.error?.error ?? 'No se pudo calcular tu objetivo nutricional.',
        );
      },
    });
  }

  remainingCalories = computed(() => {
    const p = this.progress();
    if (!p) return 0;
    return p.targetCalories - p.consumedCalories;
  });

  caloriesPercent = computed(() => {
    const p = this.progress();
    if (!p || p.targetCalories <= 0) return 0;
    return (p.consumedCalories / p.targetCalories) * 100;
  });

  completedMealsCount = computed(
    () => this.progress()?.meals.filter((m) => m.completed).length ?? 0,
  );

  ngOnInit(): void {
    this.loadDailyProgress();
  }

  loadDailyProgress(): void {
    this.loading.set(true);
    this.error.set(null);
    this.noAssignedDiet.set(false);

    this.dietService
      .getMe()
      .pipe(
        switchMap((me) => {
          if (!me.assignedDietId) {
            return of({ me, diet: null });
          }
          return this.dietService
            .getDietById(me.assignedDietId)
            .pipe(catchError(() => of(null)))
            .pipe(switchMap((diet) => of({ me, diet })));
        }),
        switchMap(({ me, diet }) =>
          forkJoin({
            me: of(me),
            diet: of(diet),
            todayLog: this.findTodaysDietLog().pipe(catchError(() => of(null))),
          }),
        ),
        switchMap(({ me, diet, todayLog }) => {
          if (!todayLog) return of({ me, diet, todayLog, todayLogDetail: null });
          return this.mealService.getDietLog(todayLog.id).pipe(
            catchError(() => of(null)),
            map((detail) => ({ me, diet, todayLog, todayLogDetail: detail })),
          );
        }),
      )
      .subscribe({
        next: ({ me, diet, todayLog, todayLogDetail }) => {
          if (!me.assignedDietId || !diet) {
            this.noAssignedDiet.set(true);
            this.progress.set(null);
            this.loading.set(false);
            return;
          }

          this.assignedDietId.set(diet.id);
          this.assignedDietName.set(diet.name);
          this.dietLogIdForToday.set(todayLog?.id ?? null);
          this.needsNutritionInput.set(me.dailyKcal === null);

          const built = this.buildProgress(
            diet,
            me.dailyKcal ?? 0,
            me.dailyProteinG,
            me.dailyCarbsG,
            me.dailyFatG,
          );
          this.progress.set(this.hydrateCompletedMeals(built, todayLogDetail?.mealLogs ?? []));
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error fetching daily progress', err);
          this.error.set(
            'No se pudo cargar el progreso diario. Comprueba tu conexión al servidor.',
          );
          this.progress.set(null);
          this.loading.set(false);
        },
      });
  }

  private hydrateCompletedMeals(
    progress: DailyNutritionProgress,
    mealLogs: { id: number; mealId: number }[],
  ): DailyNutritionProgress {
    if (mealLogs.length === 0) return progress;

    const byMealId = new Map<number, number>();
    for (const ml of mealLogs) {
      // First MealLog for a given mealId wins; backend currently allows duplicates.
      if (!byMealId.has(ml.mealId)) byMealId.set(ml.mealId, ml.id);
    }

    const meals = progress.meals.map((m) =>
      byMealId.has(m.id) ? { ...m, completed: true, mealLogId: byMealId.get(m.id) ?? null } : m,
    );
    const completed = meals.filter((m) => m.completed);
    return {
      ...progress,
      meals,
      consumedCalories: completed.reduce((s, m) => s + m.calories, 0),
      consumedProtein: completed.reduce((s, m) => s + m.protein, 0),
      consumedCarbs: completed.reduce((s, m) => s + m.carbs, 0),
      consumedFat: completed.reduce((s, m) => s + m.fat, 0),
    };
  }

  toggleMeal(meal: DailyMealItem): void {
    if (meal.completed) {
      // Backend has no endpoint to undo a meal log; keep marked.
      return;
    }
    const dietLogId = this.dietLogIdForToday();
    const dietId = this.assignedDietId();
    if (!dietId) return;

    const markObs = dietLogId
      ? this.mealService.markMeal(dietLogId, meal.id)
      : this.mealService.createDietLog({ dietId, loggedAt: this.todayIso() }).pipe(
          switchMap((log) => {
            this.dietLogIdForToday.set(log.id);
            return this.mealService.markMeal(log.id, meal.id);
          }),
        );

    markObs.subscribe({
      next: (mealLog) => this.applyMealCompletion(meal.id, mealLog.id),
      error: (err) => {
        console.error('Error marking meal', err);
        this.error.set('No se pudo marcar la comida.');
      },
    });
  }

  private applyMealCompletion(mealId: number, mealLogId: number): void {
    const current = this.progress();
    if (!current) return;

    const meals = current.meals.map((m) =>
      m.id === mealId ? { ...m, completed: true, mealLogId } : m,
    );
    const completed = meals.filter((m) => m.completed);
    const consumedCalories = completed.reduce((s, m) => s + m.calories, 0);
    const consumedProtein = completed.reduce((s, m) => s + m.protein, 0);
    const consumedCarbs = completed.reduce((s, m) => s + m.carbs, 0);
    const consumedFat = completed.reduce((s, m) => s + m.fat, 0);

    this.progress.set({
      ...current,
      meals,
      consumedCalories,
      consumedProtein,
      consumedCarbs,
      consumedFat,
    });
  }

  private buildProgress(
    diet: DietDetail,
    dailyKcal: number,
    targetProtein: number | null,
    targetCarbs: number | null,
    targetFat: number | null,
  ): DailyNutritionProgress {
    const today = this.todayDayOfWeek();
    const mealsForToday = this.selectMealsForDay(diet.meals, today);

    const meals: DailyMealItem[] = mealsForToday.map((m) => {
      const totals = m.foods.reduce(
        (acc, mf) => {
          const q = mf.quantityG / 100;
          return {
            kcal: acc.kcal + (mf.food.kcalPer100g ?? 0) * q,
            protein: acc.protein + (mf.food.proteinG ?? 0) * q,
            carbs: acc.carbs + (mf.food.carbsG ?? 0) * q,
            fat: acc.fat + (mf.food.fatG ?? 0) * q,
            fiber: acc.fiber + (mf.food.fiberG ?? 0) * q,
          };
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      );

      return {
        id: m.id,
        name: m.name,
        time: m.mealTime,
        calories: Math.round(totals.kcal),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        fiber: Math.round(totals.fiber),
        foods: m.foods.map((mf) => ({
          id: mf.id,
          name: mf.food.name,
          amount: `${mf.quantityG}g`,
          calories: Math.round(((mf.food.kcalPer100g ?? 0) * mf.quantityG) / 100),
        })),
        completed: false,
        mealLogId: null,
      };
    });

    // The day's planned totals come from the meals themselves, which the backend
    // serves already adjusted to the user (UserMealFoodOverride). Eating every
    // meal -> 100% adherence. me.dailyKcal stays available as informational.
    const plannedKcal = meals.reduce((s, m) => s + m.calories, 0);
    const plannedProtein = meals.reduce((s, m) => s + m.protein, 0);
    const plannedCarbs = meals.reduce((s, m) => s + m.carbs, 0);
    const plannedFat = meals.reduce((s, m) => s + m.fat, 0);

    return {
      date: this.todayIso(),
      targetCalories: plannedKcal || dailyKcal || diet.dailyKcal || 0,
      consumedCalories: 0,
      targetProtein: plannedProtein || targetProtein,
      consumedProtein: 0,
      targetCarbs: plannedCarbs || targetCarbs,
      consumedCarbs: 0,
      targetFat: plannedFat || targetFat,
      consumedFat: 0,
      meals,
    };
  }

  private selectMealsForDay(meals: MealDetail[], day: number): MealDetail[] {
    const sameDay = meals.filter((m) => m.dayOfWeek === day);
    if (sameDay.length > 0) return sameDay;
    // Fixture data sometimes only seeds dayOfWeek=1, so fall back to all
    // meals to keep the UI useful.
    return meals;
  }

  private findTodaysDietLog() {
    const today = this.todayIso();
    return this.mealService
      .getDietLogHistory(1, 20)
      .pipe(switchMap((res) => of(res.data.find((l) => l.loggedAt === today) ?? null)));
  }

  private todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  private todayDayOfWeek(): number {
    const d = new Date().getDay(); // 0=Sun..6=Sat
    return d === 0 ? 7 : d;
  }
}
