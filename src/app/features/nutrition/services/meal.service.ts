import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type GeneralFeeling = 'bad' | 'regular' | 'good' | 'great';

export interface DietLogSummary {
  id: number;
  loggedAt: string; // YYYY-MM-DD
  dietId: number | null;
  generalFeeling: GeneralFeeling | null;
  notes: string | null;
  mealCount: number;
}

export interface DietLogHistory {
  data: DietLogSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateDietLogPayload {
  dietId?: number;
  loggedAt?: string; // YYYY-MM-DD
  generalFeeling?: GeneralFeeling;
  notes?: string;
}

export interface MealLogCreated {
  id: number;
  mealId: number;
  mealName: string;
}

export interface MealLogEntry {
  id: number;
  mealId: number;
  mealName: string;
  enjoyment: number | null;
  satiety: number | null;
}

export interface DietLogDetail {
  id: number;
  loggedAt: string;
  dietId: number | null;
  generalFeeling: GeneralFeeling | null;
  notes: string | null;
  mealLogs: MealLogEntry[];
}

export interface MealLogRating {
  id: number;
  enjoyment: number | null;
  satiety: number | null;
}

@Injectable({ providedIn: 'root' })
export class MealService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getDietLogHistory(page = 1, limit = 20): Observable<DietLogHistory> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<DietLogHistory>(`${this.apiUrl}/diet-logs`, { params });
  }

  getDietLog(id: number): Observable<DietLogDetail> {
    return this.http.get<DietLogDetail>(`${this.apiUrl}/diet-logs/${id}`);
  }

  createDietLog(payload: CreateDietLogPayload): Observable<DietLogSummary> {
    return this.http.post<DietLogSummary>(`${this.apiUrl}/diet-logs`, payload);
  }

  markMeal(dietLogId: number, mealId: number): Observable<MealLogCreated> {
    return this.http.post<MealLogCreated>(`${this.apiUrl}/diet-logs/${dietLogId}/meals`, {
      mealId,
    });
  }

  rateMeal(
    dietLogId: number,
    mealLogId: number,
    rating: { enjoyment?: number; satiety?: number },
  ): Observable<MealLogRating> {
    return this.http.put<MealLogRating>(
      `${this.apiUrl}/diet-logs/${dietLogId}/meals/${mealLogId}`,
      rating,
    );
  }
}
