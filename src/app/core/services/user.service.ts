import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GoalType, User } from '../models/user.model';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  birthdate?: string | null; // YYYY-MM-DD
  heightCm?: number | null;
  currentWeightKg?: number | null;
  goalType?: GoalType;
  activityLevel?: ActivityLevel | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Backend serializes Doctrine decimals as JSON strings ("76.00"). Coerce to numbers.
  private toNum(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private normalize(u: User): User {
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

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(map((u) => this.normalize(u)));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    return this.http
      .put<User>(`${this.apiUrl}/users/me`, payload)
      .pipe(map((u) => this.normalize(u)));
  }
}
