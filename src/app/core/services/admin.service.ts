import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminDiet,
  AdminDietPayload,
  AdminExercise,
  AdminExercisePayload,
  AdminFood,
  AdminFoodPayload,
  AdminListResponse,
  AdminMealCreated,
  AdminMealFoodCreated,
  AdminMealFoodPayload,
  AdminMealPayload,
  AdminRole,
  AdminRoutine,
  AdminRoutineExerciseCreated,
  AdminRoutineExercisePayload,
  AdminRoutinePayload,
  AdminUser,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;
  private readonly apiUrl = environment.apiUrl;

  // ---- Users ----
  listUsers(page = 1, limit = 50): Observable<AdminListResponse<AdminUser>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<AdminListResponse<AdminUser>>(`${this.base}/users`, { params });
  }

  getUser(id: number): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.base}/users/${id}`);
  }

  changeUserRole(id: number, role: AdminRole): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.base}/users/${id}/role`, { role });
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/users/${id}`);
  }

  // ---- Exercises (catalog listed via /api/exercises; mutations via /admin) ----
  listExercises(page = 1, limit = 50): Observable<AdminListResponse<AdminExercise>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<AdminListResponse<AdminExercise>>(`${this.apiUrl}/exercises`, { params });
  }

  createExercise(payload: AdminExercisePayload): Observable<AdminExercise> {
    return this.http.post<AdminExercise>(`${this.base}/exercises`, payload);
  }

  updateExercise(id: number, payload: AdminExercisePayload): Observable<AdminExercise> {
    return this.http.put<AdminExercise>(`${this.base}/exercises/${id}`, payload);
  }

  deleteExercise(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/exercises/${id}`);
  }

  // ---- Routines ----
  listRoutines(page = 1, limit = 50): Observable<AdminListResponse<AdminRoutine>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<AdminListResponse<AdminRoutine>>(`${this.apiUrl}/routines`, { params });
  }

  createRoutine(payload: AdminRoutinePayload): Observable<AdminRoutine> {
    return this.http.post<AdminRoutine>(`${this.base}/routines`, payload);
  }

  updateRoutine(id: number, payload: AdminRoutinePayload): Observable<AdminRoutine> {
    return this.http.put<AdminRoutine>(`${this.base}/routines/${id}`, payload);
  }

  deleteRoutine(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/routines/${id}`);
  }

  addRoutineExercise(
    routineId: number,
    payload: AdminRoutineExercisePayload,
  ): Observable<AdminRoutineExerciseCreated> {
    return this.http.post<AdminRoutineExerciseCreated>(
      `${this.base}/routines/${routineId}/exercises`,
      payload,
    );
  }

  removeRoutineExercise(routineId: number, reId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/routines/${routineId}/exercises/${reId}`,
    );
  }

  // ---- Foods ----
  listFoods(page = 1, limit = 50, search = ''): Observable<AdminListResponse<AdminFood>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<AdminListResponse<AdminFood>>(`${this.apiUrl}/foods`, { params });
  }

  createFood(payload: AdminFoodPayload): Observable<AdminFood> {
    return this.http.post<AdminFood>(`${this.base}/foods`, payload);
  }

  updateFood(id: number, payload: AdminFoodPayload): Observable<AdminFood> {
    return this.http.put<AdminFood>(`${this.base}/foods/${id}`, payload);
  }

  deleteFood(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/foods/${id}`);
  }

  // ---- Diets ----
  listDiets(page = 1, limit = 50): Observable<AdminListResponse<AdminDiet>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<AdminListResponse<AdminDiet>>(`${this.apiUrl}/diets`, { params });
  }

  createDiet(payload: AdminDietPayload): Observable<AdminDiet> {
    return this.http.post<AdminDiet>(`${this.base}/diets`, payload);
  }

  updateDiet(id: number, payload: AdminDietPayload): Observable<AdminDiet> {
    return this.http.put<AdminDiet>(`${this.base}/diets/${id}`, payload);
  }

  deleteDiet(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/diets/${id}`);
  }

  addDietMeal(dietId: number, payload: AdminMealPayload): Observable<AdminMealCreated> {
    return this.http.post<AdminMealCreated>(`${this.base}/diets/${dietId}/meals`, payload);
  }

  deleteMeal(mealId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/meals/${mealId}`);
  }

  addMealFood(mealId: number, payload: AdminMealFoodPayload): Observable<AdminMealFoodCreated> {
    return this.http.post<AdminMealFoodCreated>(`${this.base}/meals/${mealId}/foods`, payload);
  }

  removeMealFood(mealFoodId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/meal-foods/${mealFoodId}`);
  }
}
