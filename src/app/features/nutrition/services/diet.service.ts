import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/user.model';
import { DietDetail, DietListItem, GoalType } from '../models/diet.model';

export interface NutritionApplyPayload {
  bodyFatPercent?: number;
  activityLevel?: string;
  sex?: 'male' | 'female';
}

@Injectable({ providedIn: 'root' })
export class DietService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Backend returns Doctrine decimals as JSON strings ("389.00"). Coerce to numbers
  // so template math (and the | number pipe) doesn't produce NaN.
  private toNum(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeDietListItem(d: DietListItem): DietListItem {
    return { ...d, dailyKcal: this.toNum(d.dailyKcal), mealCount: this.toNum(d.mealCount) ?? 0 };
  }

  private normalizeDietDetail(d: DietDetail): DietDetail {
    return {
      ...d,
      dailyKcal: this.toNum(d.dailyKcal),
      meals: d.meals.map((m) => ({
        ...m,
        foods: m.foods.map((mf) => ({
          ...mf,
          quantityG: this.toNum(mf.quantityG) ?? 0,
          food: {
            ...mf.food,
            kcalPer100g: this.toNum(mf.food.kcalPer100g),
            proteinG: this.toNum(mf.food.proteinG),
            carbsG: this.toNum(mf.food.carbsG),
            fatG: this.toNum(mf.food.fatG),
            fiberG: this.toNum(mf.food.fiberG),
          },
        })),
      })),
    };
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

  getDiets(goalType?: GoalType): Observable<DietListItem[]> {
    let params = new HttpParams();
    if (goalType) {
      params = params.set('goal_type', goalType);
    }
    return this.http
      .get<{ data: DietListItem[] }>(`${this.apiUrl}/diets`, { params })
      .pipe(map((res) => res.data.map((d) => this.normalizeDietListItem(d))));
  }

  getDietById(id: number): Observable<DietDetail> {
    return this.http
      .get<DietDetail>(`${this.apiUrl}/diets/${id}`)
      .pipe(map((d) => this.normalizeDietDetail(d)));
  }

  assignDiet(dietId: number): Observable<{ message: string; assignedDietId: number }> {
    return this.http.post<{ message: string; assignedDietId: number }>(
      `${this.apiUrl}/users/me/assign-diet`,
      { dietId },
    );
  }

  // Fetches /users/me. If nutrition targets are missing or older than a week AND
  // the profile has enough inputs to compute them, auto-applies the calc and
  // returns the refreshed user.
  getMe(): Observable<User> {
    return this.http
      .get<User>(`${this.apiUrl}/users/me`)
      .pipe(map((u) => this.normalizeUser(u)))
      .pipe(
        switchMap((u) => {
          if (!this.shouldRecalcNutrition(u)) return of(u);
          const payload = this.buildNutritionPayload(u);
          if (!payload) return of(u);
          return this.applyNutrition(payload).pipe(
            switchMap(() =>
              this.http
                .get<User>(`${this.apiUrl}/users/me`)
                .pipe(map((fresh) => this.normalizeUser(fresh))),
            ),
          );
        }),
      );
  }

  applyNutrition(payload: NutritionApplyPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/users/me/nutrition/apply`, payload);
  }

  private shouldRecalcNutrition(u: User): boolean {
    if (u.dailyKcal === null) return true;
    if (!u.nutritionCalculatedAt) return true;
    const calc = new Date(u.nutritionCalculatedAt).getTime();
    if (Number.isNaN(calc)) return true;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - calc > weekMs;
  }

  private buildNutritionPayload(u: User): NutritionApplyPayload | null {
    // Calculator needs either bodyFatPercent or sex, plus activityLevel
    // (overridable). Without enough inputs, skip and let the UI prompt later.
    if (u.bodyFatPercent === null && !u.activityLevel) return null;
    const payload: NutritionApplyPayload = {};
    if (u.bodyFatPercent !== null) payload.bodyFatPercent = u.bodyFatPercent;
    if (u.activityLevel) payload.activityLevel = u.activityLevel;
    // sex isn't stored on User; can't derive. If no bodyFatPercent, /apply will 400.
    if (u.bodyFatPercent === null) return null;
    return payload;
  }
}
