import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../services/stats.service';
import { StatTile } from '../../../shared/components/stat-tile/stat-tile';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { Badge } from '../../../shared/components/badge/badge';

export interface BmiCategory {
  label: string;
  color: string;
  min: number;
  max: number;
}

const BMI_CATEGORIES: BmiCategory[] = [
  { label: 'Bajo peso', color: '#3498db', min: 0, max: 18.5 },
  { label: 'Normal', color: '#2ecc71', min: 18.5, max: 25 },
  { label: 'Sobrepeso', color: '#f39c12', min: 25, max: 30 },
  { label: 'Obesidad I', color: '#e67e22', min: 30, max: 35 },
  { label: 'Obesidad II', color: '#e74c3c', min: 35, max: 40 },
  { label: 'Obesidad III', color: '#c0392b', min: 40, max: 100 },
];

@Component({
  selector: 'app-body-weight',
  standalone: true,
  imports: [CommonModule, FormsModule, StatTile, SectionCard, Badge],
  templateUrl: './body-weight.html',
  styleUrl: './body-weight.scss',
})
export class BodyWeight implements OnInit {
  private readonly statsService = inject(StatsService);

  readonly history = this.statsService.weightHistory;
  readonly kpis = this.statsService.weightKpis;
  readonly loading = this.statsService.loading;
  readonly userHeightCm = this.statsService.userHeightCm;

  newWeight = '';
  newDate = new Date().toISOString().split('T')[0];
  newNotes = '';

  highlightedEntryId = signal<number | null>(null);
  editingHeight = signal(false);
  editHeightValue = '';

  readonly bmiCategories = BMI_CATEGORIES;

  readonly currentBmi = computed(() => {
    const weight = this.kpis().currentWeight;
    const heightCm = this.userHeightCm();
    if (!weight || !heightCm) return null;
    const heightM = heightCm / 100;
    return weight / (heightM * heightM);
  });

  readonly currentBmiCategory = computed(() => {
    const bmi = this.currentBmi();
    if (bmi === null) return null;
    return BMI_CATEGORIES.find((c) => bmi >= c.min && bmi < c.max) ?? BMI_CATEGORIES[5];
  });

  readonly bmiIndicatorPercent = computed(() => {
    const bmi = this.currentBmi();
    if (bmi === null) return 0;
    // Map BMI 15-45 to 0-100%
    return Math.max(0, Math.min(100, ((bmi - 15) / (45 - 15)) * 100));
  });

  readonly chartData = computed(() => {
    const data = this.history();
    const heightCm = this.userHeightCm();
    if (!data.length) return null;

    const sorted = [...data].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
    );

    const w = 600;
    const h = 250;
    const padding = 50;

    const values = sorted.map((d) => {
      const weight = Number(d.weightKg);
      if (heightCm) {
        const hM = heightCm / 100;
        return weight / (hM * hM);
      }
      return weight;
    });

    const minV = Math.floor(Math.min(...values) - 1);
    const maxV = Math.ceil(Math.max(...values) + 1);
    const rangeV = maxV - minV || 1;

    const firstDate = new Date(sorted[0].loggedAt).getTime();
    const lastDate = new Date(sorted[sorted.length - 1].loggedAt).getTime();
    const rangeTime = lastDate - firstDate || 1;

    const points = sorted.map((d, idx) => {
      const time = new Date(d.loggedAt).getTime();
      const x = padding + ((time - firstDate) / rangeTime) * (w - padding * 2);

      const finalX = sorted.length === 1 ? w / 2 : x;
      const finalY = h - padding - ((values[idx] - minV) / rangeV) * (h - padding * 2);

      return {
        id: d.id,
        x: finalX,
        y: finalY,
        date: d.loggedAt,
        weight: Number(d.weightKg),
        bmi: values[idx],
      };
    });

    const dLine = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    return { points, dLine, minV, maxV, viewBox: `0 0 ${w} ${h}` };
  });

  readonly sortedHistoryDesc = computed(() => {
    return [...this.history()].sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );
  });

  ngOnInit() {
    this.statsService.refreshAll();
  }

  submitWeight() {
    if (!this.newWeight) return;
    this.statsService
      .logWeight({
        weightKg: Number(this.newWeight),
        loggedAt: this.newDate,
        notes: this.newNotes || undefined,
      })
      .subscribe(() => {
        this.newWeight = '';
        this.newNotes = '';
        this.newDate = new Date().toISOString().split('T')[0];
      });
  }

  startEditHeight() {
    this.editHeightValue = this.userHeightCm()?.toString() ?? '';
    this.editingHeight.set(true);
  }

  saveHeight() {
    const val = Number(this.editHeightValue);
    if (val >= 50 && val <= 300) {
      this.statsService.updateUserHeight(val).subscribe(() => {
        this.editingHeight.set(false);
      });
    }
  }

  cancelEditHeight() {
    this.editingHeight.set(false);
  }

  getDiff(currentIdx: number): number | null {
    const list = this.sortedHistoryDesc();
    if (currentIdx >= list.length - 1) return null;
    const curr = Number(list[currentIdx].weightKg);
    const prev = Number(list[currentIdx + 1].weightKg);
    return curr - prev;
  }

  getBmiForWeight(weightKg: string): number | null {
    const heightCm = this.userHeightCm();
    if (!heightCm) return null;
    const hM = heightCm / 100;
    return Number(weightKg) / (hM * hM);
  }

  getBmiCategoryForWeight(weightKg: string): BmiCategory | null {
    const bmi = this.getBmiForWeight(weightKg);
    if (bmi === null) return null;
    return BMI_CATEGORIES.find((c) => bmi >= c.min && bmi < c.max) ?? BMI_CATEGORIES[5];
  }

  deleteWeightLog(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este registro de peso de tu historial?')) {
      this.statsService.deleteWeightLog(id);
    }
  }
}
