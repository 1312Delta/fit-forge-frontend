import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { DietService } from '../services/diet.service';
import {
  DietDetail as DietDetailModel,
  FoodDetail,
  GOAL_TYPE_LABELS,
  GoalType,
  MealDetail,
} from '../models/diet.model';

interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

@Component({
  selector: 'app-diet-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diet-detail.html',
  styleUrls: ['./diet-detail.scss'],
})
export class DietDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly dietService = inject(DietService);

  diet = signal<DietDetailModel | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  assigning = signal<boolean>(false);
  selectedDayIndex = signal<number>(1); // 1=Monday … 7=Sunday

  readonly days = [
    { label: 'Lunes', value: 1 },
    { label: 'Martes', value: 2 },
    { label: 'Miércoles', value: 3 },
    { label: 'Jueves', value: 4 },
    { label: 'Viernes', value: 5 },
    { label: 'Sábado', value: 6 },
    { label: 'Domingo', value: 7 },
  ];

  readonly goalLabel = (g: GoalType | null): string => (g ? GOAL_TYPE_LABELS[g] : '');

  mealsForSelectedDay = computed<MealDetail[]>(() => {
    const d = this.diet();
    if (!d) return [];
    const day = this.selectedDayIndex();
    const sameDay = d.meals.filter((m) => m.dayOfWeek === day);
    // If the diet has no per-day breakdown (e.g. fixture data with only dayOfWeek=1),
    // fall back to showing all meals.
    if (sameDay.length === 0 && d.meals.some((m) => m.dayOfWeek !== day)) {
      return d.meals;
    }
    return sameDay;
  });

  mealTotals(meal: MealDetail): MacroTotals {
    return meal.foods.reduce<MacroTotals>(
      (acc, mf) => {
        const f = mf.food;
        const q = mf.quantityG / 100;
        return {
          kcal: acc.kcal + (f.kcalPer100g ?? 0) * q,
          protein: acc.protein + (f.proteinG ?? 0) * q,
          carbs: acc.carbs + (f.carbsG ?? 0) * q,
          fat: acc.fat + (f.fatG ?? 0) * q,
          fiber: acc.fiber + (f.fiberG ?? 0) * q,
        };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
  }

  dietTotals = computed<MacroTotals>(() => {
    const d = this.diet();
    if (!d) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    return this.mealsForSelectedDay().reduce<MacroTotals>(
      (acc, m) => {
        const t = this.mealTotals(m);
        return {
          kcal: acc.kcal + t.kcal,
          protein: acc.protein + t.protein,
          carbs: acc.carbs + t.carbs,
          fat: acc.fat + t.fat,
          fiber: acc.fiber + t.fiber,
        };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
  });

  foodKcal(food: FoodDetail, quantityG: number): number {
    return ((food.kcalPer100g ?? 0) * quantityG) / 100;
  }

  foodMacro(value: number | null, quantityG: number): number {
    return ((value ?? 0) * quantityG) / 100;
  }

  ngOnInit(): void {
    const today = new Date().getDay(); // 0=Sun..6=Sat
    this.selectedDayIndex.set(today === 0 ? 7 : today);

    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;
      if (Number.isFinite(id)) {
        this.loadDiet(id);
      }
    });
  }

  loadDiet(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      diet: this.dietService.getDietById(id),
      me: this.dietService.getMe().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ diet, me }) => {
        this.diet.set({ ...diet, assigned: me?.assignedDietId === diet.id });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching diet details', err);
        this.error.set('No se pudo cargar la dieta.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  assignDiet(): void {
    const d = this.diet();
    if (!d || this.assigning()) return;
    this.assigning.set(true);
    this.dietService.assignDiet(d.id).subscribe({
      next: () => {
        this.diet.set({ ...d, assigned: true });
        this.assigning.set(false);
      },
      error: (err) => {
        console.error('Error assigning diet', err);
        this.assigning.set(false);
        this.error.set('No se pudo asignar la dieta.');
      },
    });
  }
}
