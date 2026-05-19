import { Component, DestroyRef, computed, effect, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { Badge } from '../../../shared/components/badge/badge';
import { StarRating } from '../../../shared/components/star-rating/star-rating';
import { ActiveExercise, ActiveSet } from '../models/workouts.models';
import { WorkoutsService } from '../services/workouts.service';

@Component({
  selector: 'app-active-session',
  imports: [Badge, StarRating],
  templateUrl: './active-session.html',
  styleUrl: './active-session.scss',
})
export class ActiveSession implements OnInit {
  private readonly ws = inject(WorkoutsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routineId = this.route.snapshot.queryParamMap.get('routineId');
  private readonly sessionData = this.ws.getActiveSession(this.routineId);

  readonly routineName = computed(() => this.sessionData().routineName);
  readonly exercises = signal<ActiveExercise[]>([]);

  readonly elapsedSec = signal(0);
  readonly sessionId = signal<number | null>(null);
  readonly isSaving = signal(false);

  readonly completedSets = computed(() =>
    this.exercises().reduce((acc, ex) => acc + ex.sets.filter((s) => s.done).length, 0),
  );

  readonly totalSets = computed(() =>
    this.exercises().reduce((acc, ex) => acc + ex.sets.length, 0),
  );

  readonly progress = computed(() =>
    this.totalSets() > 0 ? Math.round((this.completedSets() / this.totalSets()) * 100) : 0,
  );

  readonly elapsedLabel = computed(() => {
    const s = this.elapsedSec();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  readonly muscleLabel: Record<string, string> = {
    pecho: 'Pecho',
    espalda: 'Espalda',
    hombros: 'Hombros',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    piernas: 'Piernas',
    abdomen: 'Abdomen',
    cardio: 'Cardio',
  };

  constructor() {
    const interval = setInterval(() => this.elapsedSec.update((s) => s + 1), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));

    effect(() => {
      const exs = this.sessionData().exercises;
      if (exs.length > 0) this.exercises.set(structuredClone(exs));
    });
  }

  ngOnInit() {
    const rId = this.routineId ? parseInt(this.routineId, 10) : undefined;
    this.ws.createSession(rId).subscribe({
      next: (res) => {
        console.log('[WS] createSession', res);
        this.sessionId.set(res.id);
      },
      error: (err) => console.error('[WS] createSession FAILED', err),
    });
  }

  async finishSession() {
    const sId = this.sessionId();
    if (!sId) {
      alert(
        'La sesión aún no se ha registrado en el servidor. Espera un momento e inténtalo de nuevo.',
      );
      return;
    }

    this.isSaving.set(true);
    try {
      for (let i = 0; i < this.exercises().length; i++) {
        const ex = this.exercises()[i];
        const doneSets = ex.sets.filter((s) => s.done);

        if (doneSets.length > 0) {
          const exRes = await lastValueFrom(
            this.ws.addExerciseToSession(sId, parseInt(ex.exerciseId, 10), i),
          );
          const sessionExerciseId = exRes.id;

          for (const set of doneSets) {
            await lastValueFrom(
              this.ws.addSetToExercise(
                sId,
                sessionExerciseId,
                set.setNumber,
                set.reps,
                set.weight || '0',
              ),
            );
          }

          if (ex.rating > 0) {
            const difficulty = ex.rating;
            const enjoyment = ex.rating;
            await lastValueFrom(
              this.ws.rateSessionExercise(sId, sessionExerciseId, enjoyment, difficulty),
            );
          }
        }
      }

      const durationMin = Math.floor(this.elapsedSec() / 60);
      await lastValueFrom(this.ws.finishSession(sId, durationMin, 'good'));

      this.router.navigate(['/workouts/sessions', sId, 'summary']);
    } catch (err) {
      console.error('Error saving session:', err);
      alert('Hubo un error al guardar la sesión. Revisa la consola.');
    } finally {
      this.isSaving.set(false);
    }
  }

  toggleSet(exIdx: number, setIdx: number) {
    this.exercises.update((exs) => {
      const clone = structuredClone(exs);
      clone[exIdx].sets[setIdx].done = !clone[exIdx].sets[setIdx].done;
      return clone;
    });
  }

  updateReps(exIdx: number, setIdx: number, value: string, inputEl: HTMLInputElement) {
    const sanitized = value.replace(/[^0-9]/g, '');
    const num = sanitized === '' ? null : parseInt(sanitized, 10);
    inputEl.value = num === null ? '' : String(num);
    this.exercises.update((exs) => {
      const clone = structuredClone(exs);
      clone[exIdx].sets[setIdx].reps = num;
      return clone;
    });
  }

  updateWeight(exIdx: number, setIdx: number, value: string, inputEl: HTMLInputElement) {
    const sanitized = value.replace(/[^0-9.]/g, '').replace(/^0+(\d)/, '$1');
    inputEl.value = sanitized;
    this.exercises.update((exs) => {
      const clone = structuredClone(exs);
      clone[exIdx].sets[setIdx].weight = sanitized;
      return clone;
    });
  }

  updateRating(exIdx: number, rating: number) {
    this.exercises.update((exs) => {
      const clone = structuredClone(exs);
      clone[exIdx].rating = rating;
      return clone;
    });
  }

  addSet(exIdx: number) {
    this.exercises.update((exs) => {
      const clone = structuredClone(exs);
      const sets = clone[exIdx].sets;
      const last = sets[sets.length - 1] as ActiveSet;
      sets.push({ setNumber: sets.length + 1, reps: null, weight: last.weight, done: false });
      return clone;
    });
  }

  allDone(ex: ActiveExercise) {
    return ex.sets.every((s) => s.done);
  }
}
