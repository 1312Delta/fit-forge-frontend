import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import {
  AdminDiet,
  AdminDietPayload,
  AdminExercise,
  AdminExercisePayload,
  AdminFood,
  AdminFoodPayload,
  AdminMealFoodPayload,
  AdminMealPayload,
  AdminRole,
  AdminRoutine,
  AdminRoutineExercisePayload,
  AdminRoutinePayload,
  AdminUser,
} from '../../../core/models/admin.models';
import { GoalType } from '../../../core/models/user.model';

type Tab = 'users' | 'exercises' | 'routines' | 'foods' | 'diets';

const GOAL_OPTIONS: GoalType[] = ['weight_loss', 'muscle_gain', 'maintenance', 'endurance'];
const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced'] as const;

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrls: ['./admin-panel.scss'],
})
export class AdminPanel implements OnInit {
  private readonly admin = inject(AdminService);

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'users', label: 'Usuarios', icon: '👤' },
    { id: 'exercises', label: 'Ejercicios', icon: '🏋️' },
    { id: 'routines', label: 'Rutinas', icon: '📋' },
    { id: 'foods', label: 'Alimentos', icon: '🥗' },
    { id: 'diets', label: 'Dietas', icon: '🍽️' },
  ];

  readonly goalOptions = GOAL_OPTIONS;
  readonly difficultyOptions = DIFFICULTY_OPTIONS;

  activeTab = signal<Tab>('users');

  // Users
  users = signal<AdminUser[]>([]);
  usersLoading = signal(false);
  usersError = signal<string | null>(null);
  usersPage = signal(1);
  usersLimit = 50;
  usersTotal = signal(0);

  // Exercises
  exercises = signal<AdminExercise[]>([]);
  exercisesLoading = signal(false);
  exercisesError = signal<string | null>(null);
  exerciseForm = signal<AdminExercisePayload & { id?: number | null }>({
    id: null,
    name: '',
    description: '',
    muscleGroup: '',
    equipment: '',
    caloriesPerMin: null,
  });

  // Routines
  routines = signal<AdminRoutine[]>([]);
  routinesLoading = signal(false);
  routinesError = signal<string | null>(null);
  routineForm = signal<AdminRoutinePayload & { id?: number | null }>({
    id: null,
    name: '',
    description: '',
    difficulty: 'beginner',
    goalType: 'maintenance',
  });
  routineExerciseForm = signal<{
    routineId: number | null;
    exerciseId: number | null;
    sets: number | null;
    reps: number | null;
    orderIndex: number | null;
  }>({
    routineId: null,
    exerciseId: null,
    sets: null,
    reps: null,
    orderIndex: null,
  });
  routineExerciseRemove = signal<{ routineId: number | null; reId: number | null }>({
    routineId: null,
    reId: null,
  });

  // Foods
  foods = signal<AdminFood[]>([]);
  foodsLoading = signal(false);
  foodsError = signal<string | null>(null);
  foodsPage = signal(1);
  foodsLimit = 50;
  foodsTotal = signal(0);
  foodsSearch = signal('');
  foodForm = signal<AdminFoodPayload & { id?: number | null }>({
    id: null,
    name: '',
    brand: '',
    kcalPer100g: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
  });

  // Diets
  diets = signal<AdminDiet[]>([]);
  dietsLoading = signal(false);
  dietsError = signal<string | null>(null);
  dietForm = signal<AdminDietPayload & { id?: number | null }>({
    id: null,
    name: '',
    description: '',
    dailyKcal: null,
    goalType: 'maintenance',
  });
  mealForm = signal<{
    dietId: number | null;
    name: string;
    mealTime: string;
    dayOfWeek: number | null;
  }>({
    dietId: null,
    name: '',
    mealTime: '',
    dayOfWeek: null,
  });
  mealFoodForm = signal<{ mealId: number | null; foodId: number | null; quantityG: number | null }>(
    { mealId: null, foodId: null, quantityG: null },
  );
  mealDelete = signal<number | null>(null);
  mealFoodDelete = signal<number | null>(null);

  // Flash
  notice = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  ngOnInit(): void {
    this.loadUsers();
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'users' && this.users().length === 0) this.loadUsers();
    if (tab === 'exercises' && this.exercises().length === 0) this.loadExercises();
    if (tab === 'routines' && this.routines().length === 0) this.loadRoutines();
    if (tab === 'foods' && this.foods().length === 0) this.loadFoods();
    if (tab === 'diets' && this.diets().length === 0) this.loadDiets();
  }

  private flash(kind: 'success' | 'error', text: string): void {
    this.notice.set({ kind, text });
    setTimeout(() => this.notice.set(null), 3500);
  }

  private errorMessage(err: unknown, fallback: string): string {
    const e = err as { error?: { error?: string; message?: string }; message?: string };
    return e?.error?.error ?? e?.error?.message ?? e?.message ?? fallback;
  }

  // ─────────────────────── Users ───────────────────────
  loadUsers(page = this.usersPage()): void {
    this.usersLoading.set(true);
    this.usersError.set(null);
    this.usersPage.set(page);
    this.admin.listUsers(page, this.usersLimit).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.usersTotal.set(res.total ?? res.data.length);
        this.usersLoading.set(false);
      },
      error: (err) => {
        this.usersError.set(this.errorMessage(err, 'No se pudieron cargar los usuarios'));
        this.usersLoading.set(false);
      },
    });
  }

  changeRole(user: AdminUser, role: AdminRole): void {
    if (user.role === role) return;
    this.admin.changeUserRole(user.id, role).subscribe({
      next: (updated) => {
        this.users.update((arr) => arr.map((u) => (u.id === updated.id ? updated : u)));
        this.flash('success', `Rol actualizado para ${updated.username}`);
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo cambiar el rol')),
    });
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(`¿Eliminar usuario ${user.username}? Esta acción no se puede deshacer.`)) return;
    this.admin.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((arr) => arr.filter((u) => u.id !== user.id));
        this.flash('success', `Usuario ${user.username} eliminado`);
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar el usuario')),
    });
  }

  prevUsersPage(): void {
    if (this.usersPage() > 1) this.loadUsers(this.usersPage() - 1);
  }
  nextUsersPage(): void {
    const max = Math.ceil(this.usersTotal() / this.usersLimit) || 1;
    if (this.usersPage() < max) this.loadUsers(this.usersPage() + 1);
  }

  // ─────────────────────── Exercises ───────────────────────
  loadExercises(): void {
    this.exercisesLoading.set(true);
    this.exercisesError.set(null);
    this.admin.listExercises(1, 100).subscribe({
      next: (res) => {
        this.exercises.set(res.data);
        this.exercisesLoading.set(false);
      },
      error: (err) => {
        this.exercisesError.set(this.errorMessage(err, 'No se pudieron cargar los ejercicios'));
        this.exercisesLoading.set(false);
      },
    });
  }

  editExercise(ex: AdminExercise): void {
    this.exerciseForm.set({
      id: ex.id,
      name: ex.name,
      description: ex.description ?? '',
      muscleGroup: ex.muscleGroup ?? '',
      equipment: ex.equipment ?? '',
      caloriesPerMin: ex.caloriesPerMin ?? null,
    });
  }

  resetExerciseForm(): void {
    this.exerciseForm.set({
      id: null,
      name: '',
      description: '',
      muscleGroup: '',
      equipment: '',
      caloriesPerMin: null,
    });
  }

  saveExercise(): void {
    const { id, ...payload } = this.exerciseForm();
    if (!payload.name) {
      this.flash('error', 'El nombre del ejercicio es obligatorio');
      return;
    }
    const obs = id ? this.admin.updateExercise(id, payload) : this.admin.createExercise(payload);
    obs.subscribe({
      next: (saved) => {
        this.exercises.update((arr) => {
          const idx = arr.findIndex((e) => e.id === saved.id);
          if (idx >= 0) {
            const copy = [...arr];
            copy[idx] = saved;
            return copy;
          }
          return [saved, ...arr];
        });
        this.resetExerciseForm();
        this.flash('success', id ? 'Ejercicio actualizado' : 'Ejercicio creado');
      },
      error: (err) =>
        this.flash('error', this.errorMessage(err, 'No se pudo guardar el ejercicio')),
    });
  }

  deleteExercise(ex: AdminExercise): void {
    if (!confirm(`¿Eliminar ejercicio "${ex.name}"?`)) return;
    this.admin.deleteExercise(ex.id).subscribe({
      next: () => {
        this.exercises.update((arr) => arr.filter((e) => e.id !== ex.id));
        this.flash('success', 'Ejercicio eliminado');
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar')),
    });
  }

  updateExerciseField<K extends keyof AdminExercisePayload>(
    key: K,
    value: AdminExercisePayload[K],
  ): void {
    this.exerciseForm.update((f) => ({ ...f, [key]: value }));
  }

  // ─────────────────────── Routines ───────────────────────
  loadRoutines(): void {
    this.routinesLoading.set(true);
    this.routinesError.set(null);
    this.admin.listRoutines().subscribe({
      next: (res) => {
        this.routines.set(res.data);
        this.routinesLoading.set(false);
      },
      error: (err) => {
        this.routinesError.set(this.errorMessage(err, 'No se pudieron cargar las rutinas'));
        this.routinesLoading.set(false);
      },
    });
  }

  editRoutine(r: AdminRoutine): void {
    this.routineForm.set({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      difficulty: (r.difficulty as 'beginner' | 'intermediate' | 'advanced') ?? 'beginner',
      goalType: r.goalType ?? 'maintenance',
    });
  }

  resetRoutineForm(): void {
    this.routineForm.set({
      id: null,
      name: '',
      description: '',
      difficulty: 'beginner',
      goalType: 'maintenance',
    });
  }

  saveRoutine(): void {
    const { id, ...payload } = this.routineForm();
    if (!payload.name || !payload.goalType) {
      this.flash('error', 'Nombre y objetivo son obligatorios');
      return;
    }
    const obs = id ? this.admin.updateRoutine(id, payload) : this.admin.createRoutine(payload);
    obs.subscribe({
      next: (saved) => {
        this.routines.update((arr) => {
          const idx = arr.findIndex((r) => r.id === saved.id);
          if (idx >= 0) {
            const copy = [...arr];
            copy[idx] = { ...arr[idx], ...saved };
            return copy;
          }
          return [saved, ...arr];
        });
        this.resetRoutineForm();
        this.flash('success', id ? 'Rutina actualizada' : 'Rutina creada');
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo guardar la rutina')),
    });
  }

  deleteRoutine(r: AdminRoutine): void {
    if (!confirm(`¿Eliminar rutina "${r.name}"?`)) return;
    this.admin.deleteRoutine(r.id).subscribe({
      next: () => {
        this.routines.update((arr) => arr.filter((x) => x.id !== r.id));
        this.flash('success', 'Rutina eliminada');
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar la rutina')),
    });
  }

  updateRoutineField<K extends keyof AdminRoutinePayload>(
    key: K,
    value: AdminRoutinePayload[K],
  ): void {
    this.routineForm.update((f) => ({ ...f, [key]: value }));
  }

  updateRoutineExerciseForm<K extends keyof ReturnType<typeof this.routineExerciseForm>>(
    key: K,
    value: ReturnType<typeof this.routineExerciseForm>[K],
  ): void {
    this.routineExerciseForm.update((f) => ({ ...f, [key]: value }));
  }

  addRoutineExercise(): void {
    const f = this.routineExerciseForm();
    if (!f.routineId || !f.exerciseId) {
      this.flash('error', 'routineId y exerciseId son obligatorios');
      return;
    }
    const payload: AdminRoutineExercisePayload = {
      exerciseId: f.exerciseId,
      sets: f.sets,
      reps: f.reps,
    };
    if (f.orderIndex !== null) payload.orderIndex = f.orderIndex;

    this.admin.addRoutineExercise(f.routineId, payload).subscribe({
      next: () => {
        this.flash('success', 'Ejercicio añadido a la rutina');
        this.routineExerciseForm.set({
          routineId: f.routineId,
          exerciseId: null,
          sets: null,
          reps: null,
          orderIndex: null,
        });
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo añadir el ejercicio')),
    });
  }

  removeRoutineExercise(): void {
    const f = this.routineExerciseRemove();
    if (!f.routineId || !f.reId) {
      this.flash('error', 'routineId y reId son obligatorios');
      return;
    }
    this.admin.removeRoutineExercise(f.routineId, f.reId).subscribe({
      next: () => {
        this.flash('success', 'Ejercicio eliminado de la rutina');
        this.routineExerciseRemove.set({ routineId: null, reId: null });
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar')),
    });
  }

  updateRoutineExerciseRemove<K extends 'routineId' | 'reId'>(key: K, value: number | null): void {
    this.routineExerciseRemove.update((f) => ({ ...f, [key]: value }));
  }

  // ─────────────────────── Foods ───────────────────────
  loadFoods(page = this.foodsPage()): void {
    this.foodsLoading.set(true);
    this.foodsError.set(null);
    this.foodsPage.set(page);
    this.admin.listFoods(page, this.foodsLimit, this.foodsSearch()).subscribe({
      next: (res) => {
        this.foods.set(res.data);
        this.foodsTotal.set(res.total ?? res.data.length);
        this.foodsLoading.set(false);
      },
      error: (err) => {
        this.foodsError.set(this.errorMessage(err, 'No se pudieron cargar los alimentos'));
        this.foodsLoading.set(false);
      },
    });
  }

  prevFoodsPage(): void {
    if (this.foodsPage() > 1) this.loadFoods(this.foodsPage() - 1);
  }
  nextFoodsPage(): void {
    const max = Math.ceil(this.foodsTotal() / this.foodsLimit) || 1;
    if (this.foodsPage() < max) this.loadFoods(this.foodsPage() + 1);
  }

  setFoodsSearch(value: string): void {
    this.foodsSearch.set(value);
  }

  searchFoods(): void {
    this.loadFoods(1);
  }

  deleteFood(f: AdminFood): void {
    if (!confirm(`¿Eliminar alimento "${f.name}"?`)) return;
    this.admin.deleteFood(f.id).subscribe({
      next: () => {
        this.foods.update((arr) => arr.filter((x) => x.id !== f.id));
        if (this.foodForm().id === f.id) this.resetFoodForm();
        this.flash('success', 'Alimento eliminado');
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar')),
    });
  }

  resetFoodForm(): void {
    this.foodForm.set({
      id: null,
      name: '',
      brand: '',
      kcalPer100g: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    });
  }

  saveFood(): void {
    const { id, ...payload } = this.foodForm();
    if (!payload.name || payload.kcalPer100g === undefined || payload.kcalPer100g === null) {
      this.flash('error', 'Nombre y kcal/100g son obligatorios');
      return;
    }
    const obs = id ? this.admin.updateFood(id, payload) : this.admin.createFood(payload);
    obs.subscribe({
      next: (saved) => {
        this.foods.update((arr) => {
          const idx = arr.findIndex((f) => f.id === saved.id);
          if (idx >= 0) {
            const copy = [...arr];
            copy[idx] = saved;
            return copy;
          }
          return [saved, ...arr];
        });
        this.resetFoodForm();
        this.flash('success', id ? 'Alimento actualizado' : 'Alimento creado');
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo guardar')),
    });
  }

  editFood(f: AdminFood): void {
    this.foodForm.set({
      id: f.id,
      name: f.name,
      brand: f.brand ?? '',
      kcalPer100g: f.kcalPer100g,
      proteinG: f.proteinG ?? 0,
      carbsG: f.carbsG ?? 0,
      fatG: f.fatG ?? 0,
      fiberG: f.fiberG ?? 0,
    });
  }

  updateFoodField<K extends keyof AdminFoodPayload>(key: K, value: AdminFoodPayload[K]): void {
    this.foodForm.update((f) => ({ ...f, [key]: value }));
  }

  // ─────────────────────── Diets ───────────────────────
  loadDiets(): void {
    this.dietsLoading.set(true);
    this.dietsError.set(null);
    this.admin.listDiets().subscribe({
      next: (res) => {
        this.diets.set(res.data);
        this.dietsLoading.set(false);
      },
      error: (err) => {
        this.dietsError.set(this.errorMessage(err, 'No se pudieron cargar las dietas'));
        this.dietsLoading.set(false);
      },
    });
  }

  editDiet(d: AdminDiet): void {
    this.dietForm.set({
      id: d.id,
      name: d.name,
      description: d.description ?? '',
      dailyKcal: d.dailyKcal ?? null,
      goalType: d.goalType ?? 'maintenance',
    });
  }

  resetDietForm(): void {
    this.dietForm.set({
      id: null,
      name: '',
      description: '',
      dailyKcal: null,
      goalType: 'maintenance',
    });
  }

  saveDiet(): void {
    const { id, ...payload } = this.dietForm();
    if (!payload.name || !payload.goalType) {
      this.flash('error', 'Nombre y objetivo son obligatorios');
      return;
    }
    const obs = id ? this.admin.updateDiet(id, payload) : this.admin.createDiet(payload);
    obs.subscribe({
      next: (saved) => {
        this.diets.update((arr) => {
          const idx = arr.findIndex((d) => d.id === saved.id);
          if (idx >= 0) {
            const copy = [...arr];
            copy[idx] = { ...arr[idx], ...saved };
            return copy;
          }
          return [saved, ...arr];
        });
        this.resetDietForm();
        this.flash('success', id ? 'Dieta actualizada' : 'Dieta creada');
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo guardar la dieta')),
    });
  }

  deleteDiet(d: AdminDiet): void {
    if (!confirm(`¿Eliminar dieta "${d.name}"?`)) return;
    this.admin.deleteDiet(d.id).subscribe({
      next: () => {
        this.diets.update((arr) => arr.filter((x) => x.id !== d.id));
        this.flash('success', 'Dieta eliminada');
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar la dieta')),
    });
  }

  updateDietField<K extends keyof AdminDietPayload>(key: K, value: AdminDietPayload[K]): void {
    this.dietForm.update((f) => ({ ...f, [key]: value }));
  }

  updateMealField<K extends keyof ReturnType<typeof this.mealForm>>(
    key: K,
    value: ReturnType<typeof this.mealForm>[K],
  ): void {
    this.mealForm.update((f) => ({ ...f, [key]: value }));
  }

  addMeal(): void {
    const f = this.mealForm();
    if (!f.dietId || !f.name) {
      this.flash('error', 'dietId y nombre de comida son obligatorios');
      return;
    }
    const payload: AdminMealPayload = { name: f.name };
    if (f.mealTime) payload.mealTime = f.mealTime;
    if (f.dayOfWeek !== null) payload.dayOfWeek = f.dayOfWeek;
    this.admin.addDietMeal(f.dietId, payload).subscribe({
      next: () => {
        this.flash('success', 'Comida añadida');
        this.mealForm.set({ dietId: f.dietId, name: '', mealTime: '', dayOfWeek: null });
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo añadir')),
    });
  }

  deleteMeal(): void {
    const id = this.mealDelete();
    if (!id) {
      this.flash('error', 'Indica el id de la comida');
      return;
    }
    if (!confirm(`¿Eliminar comida #${id}?`)) return;
    this.admin.deleteMeal(id).subscribe({
      next: () => {
        this.flash('success', 'Comida eliminada');
        this.mealDelete.set(null);
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar')),
    });
  }

  updateMealFoodForm<K extends keyof ReturnType<typeof this.mealFoodForm>>(
    key: K,
    value: ReturnType<typeof this.mealFoodForm>[K],
  ): void {
    this.mealFoodForm.update((f) => ({ ...f, [key]: value }));
  }

  addMealFood(): void {
    const f = this.mealFoodForm();
    if (!f.mealId || !f.foodId || f.quantityG === null) {
      this.flash('error', 'mealId, foodId y quantityG son obligatorios');
      return;
    }
    const payload: AdminMealFoodPayload = { foodId: f.foodId, quantityG: f.quantityG };
    this.admin.addMealFood(f.mealId, payload).subscribe({
      next: () => {
        this.flash('success', 'Alimento añadido a la comida');
        this.mealFoodForm.set({ mealId: f.mealId, foodId: null, quantityG: null });
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo añadir')),
    });
  }

  removeMealFood(): void {
    const id = this.mealFoodDelete();
    if (!id) {
      this.flash('error', 'Indica el id de meal-food');
      return;
    }
    if (!confirm(`¿Eliminar meal-food #${id}?`)) return;
    this.admin.removeMealFood(id).subscribe({
      next: () => {
        this.flash('success', 'Alimento eliminado de la comida');
        this.mealFoodDelete.set(null);
      },
      error: (err) => this.flash('error', this.errorMessage(err, 'No se pudo eliminar')),
    });
  }
}
