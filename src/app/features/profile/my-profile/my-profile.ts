import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ActivityLevel,
  UpdateProfilePayload,
  UserService,
} from '../../../core/services/user.service';
import { GoalType, User } from '../../../core/models/user.model';

interface ProfileForm {
  firstName: string;
  lastName: string;
  birthdate: string;
  heightCm: number | null;
  currentWeightKg: number | null;
  goalType: GoalType | '';
  activityLevel: ActivityLevel | '';
}

const GOAL_LABELS: Record<GoalType, string> = {
  weight_loss: 'Pérdida de peso',
  muscle_gain: 'Ganancia muscular',
  maintenance: 'Mantenimiento',
  endurance: 'Resistencia',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  active: 'Activo',
  very_active: 'Muy activo',
};

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './my-profile.html',
  styleUrls: ['./my-profile.scss'],
})
export class MyProfile implements OnInit {
  private readonly userService = inject(UserService);

  user = signal<User | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<boolean>(false);

  form = signal<ProfileForm>({
    firstName: '',
    lastName: '',
    birthdate: '',
    heightCm: null,
    currentWeightKg: null,
    goalType: '',
    activityLevel: '',
  });

  readonly goalOptions: GoalType[] = ['weight_loss', 'muscle_gain', 'maintenance', 'endurance'];
  readonly activityOptions: ActivityLevel[] = [
    'sedentary',
    'light',
    'moderate',
    'active',
    'very_active',
  ];
  readonly goalLabel = (g: GoalType): string => GOAL_LABELS[g];
  readonly activityLabel = (a: ActivityLevel): string => ACTIVITY_LABELS[a];

  initials = computed<string>(() => {
    const u = this.user();
    if (!u) return '?';
    const first = u.firstName?.[0] ?? '';
    const last = u.lastName?.[0] ?? '';
    const combined = `${first}${last}`.toUpperCase();
    return combined || u.username[0]?.toUpperCase() || '?';
  });

  hasNutritionSnapshot = computed<boolean>(() => {
    const u = this.user();
    if (!u) return false;
    return (
      u.dailyKcal !== null ||
      u.dailyProteinG !== null ||
      u.dailyCarbsG !== null ||
      u.dailyFatG !== null ||
      u.bmi !== null ||
      u.bmr !== null ||
      u.tdee !== null ||
      u.bodyFatPercent !== null
    );
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.getMe().subscribe({
      next: (u) => {
        this.user.set(u);
        this.form.set({
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          birthdate: u.birthdate ?? '',
          heightCm: u.heightCm,
          currentWeightKg: u.currentWeightKg,
          goalType: u.goalType ?? '',
          activityLevel: (u.activityLevel as ActivityLevel | null) ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading profile', err);
        this.error.set('No se pudo cargar tu perfil.');
        this.loading.set(false);
      },
    });
  }

  updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save(): void {
    if (this.saving()) return;
    const f = this.form();
    const payload: UpdateProfilePayload = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      birthdate: f.birthdate || null,
      heightCm: f.heightCm,
      currentWeightKg: f.currentWeightKg,
    };
    if (f.goalType) payload.goalType = f.goalType;
    if (f.activityLevel) payload.activityLevel = f.activityLevel;
    else payload.activityLevel = null;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    this.userService.updateProfile(payload).subscribe({
      next: (u) => {
        this.user.set(u);
        this.saving.set(false);
        this.success.set(true);
        setTimeout(() => this.success.set(false), 3000);
      },
      error: (err) => {
        console.error('Error saving profile', err);
        this.error.set(err?.error?.error ?? 'No se pudo guardar el perfil.');
        this.saving.set(false);
      },
    });
  }
}
