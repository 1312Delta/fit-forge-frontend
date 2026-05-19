import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { DietService } from '../services/diet.service';
import { DietListItem, GOAL_TYPE_LABELS, GoalType } from '../models/diet.model';

interface CategoryOption {
  label: string;
  value: GoalType | 'all';
}

@Component({
  selector: 'app-diet-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './diet-catalog.html',
  styleUrls: ['./diet-catalog.scss'],
})
export class DietCatalog implements OnInit {
  private readonly dietService = inject(DietService);

  diets = signal<DietListItem[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  searchTerm = signal<string>('');
  selectedCategory = signal<GoalType | 'all'>('all');

  readonly categories: CategoryOption[] = [
    { label: 'Todas', value: 'all' },
    { label: GOAL_TYPE_LABELS.weight_loss, value: 'weight_loss' },
    { label: GOAL_TYPE_LABELS.muscle_gain, value: 'muscle_gain' },
    { label: GOAL_TYPE_LABELS.maintenance, value: 'maintenance' },
    { label: GOAL_TYPE_LABELS.endurance, value: 'endurance' },
  ];

  readonly goalLabel = (g: GoalType | null): string => (g ? GOAL_TYPE_LABELS[g] : '');

  filteredDiets = computed(() => {
    let result = this.diets();

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(term) || (d.description ?? '').toLowerCase().includes(term),
      );
    }

    const cat = this.selectedCategory();
    if (cat !== 'all') {
      result = result.filter((d) => d.goalType === cat);
    }

    return result;
  });

  ngOnInit(): void {
    this.loadDiets();
  }

  loadDiets(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      diets: this.dietService.getDiets(),
      me: this.dietService.getMe().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ diets, me }) => {
        const assignedId = me?.assignedDietId ?? null;
        this.diets.set(diets.map((d) => ({ ...d, assigned: assignedId === d.id })));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching diets', err);
        this.error.set('No se pudieron cargar las dietas. Comprueba tu conexión.');
        this.diets.set([]);
        this.loading.set(false);
      },
    });
  }

  selectCategory(value: GoalType | 'all'): void {
    this.selectedCategory.set(value);
  }

  updateSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
}
