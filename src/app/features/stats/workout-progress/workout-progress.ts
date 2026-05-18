import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../services/stats.service';
import { StatTile } from '../../../shared/components/stat-tile/stat-tile';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { Badge } from '../../../shared/components/badge/badge';

@Component({
  selector: 'app-workout-progress',
  standalone: true,
  imports: [CommonModule, StatTile, SectionCard, Badge],
  templateUrl: './workout-progress.html',
  styleUrl: './workout-progress.scss',
})
export class WorkoutProgress implements OnInit {
  private readonly statsService = inject(StatsService);

  readonly history = this.statsService.workoutHistory;
  readonly kpis = this.statsService.workoutKpis;
  readonly loading = this.statsService.loading;

  readonly sortedHistoryDesc = computed(() => {
    return [...this.history()]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 10);
  });

  readonly activityBars = computed(() => {
    const history = this.history();
    const bars = [];
    const today = new Date();

    // Normalize today for timezone local
    const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const dayOfWeek = localToday.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(localToday);
    monday.setDate(localToday.getDate() + diffToMonday);

    const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const hasSession = history.some((w) => {
        const sd = new Date(w.startedAt);
        const sdStr = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
        return sdStr === dateStr;
      });
      bars.push({
        label: dayLabels[i],
        active: hasSession,
        isToday: d.getTime() === localToday.getTime(),
      });
    }

    return bars;
  });

  readonly feelingStats = computed(() => {
    const dist = this.kpis().feelingDistribution;
    const totalWithFeeling = Object.values(dist).reduce((a, b) => a + b, 0);

    if (totalWithFeeling === 0) return null;

    return [
      {
        key: 'great',
        label: 'Excelente',
        color: 'var(--stars)',
        count: dist.great || 0,
        percent: ((dist.great || 0) / totalWithFeeling) * 100,
      },
      {
        key: 'good',
        label: 'Bien',
        color: 'var(--success)',
        count: dist.good || 0,
        percent: ((dist.good || 0) / totalWithFeeling) * 100,
      },
      {
        key: 'regular',
        label: 'Regular',
        color: 'var(--warning)',
        count: dist.regular || 0,
        percent: ((dist.regular || 0) / totalWithFeeling) * 100,
      },
      {
        key: 'bad',
        label: 'Mal',
        color: 'var(--danger)',
        count: dist.bad || 0,
        percent: ((dist.bad || 0) / totalWithFeeling) * 100,
      },
    ].filter((s) => s.count > 0);
  });

  ngOnInit() {
    if (!this.history().length) {
      this.statsService.refreshAll();
    }
  }

  getFeelingEmoji(feeling: string | null): string {
    switch (feeling) {
      case 'great':
        return '🤩';
      case 'good':
        return '🙂';
      case 'regular':
        return '😐';
      case 'bad':
        return '😩';
      default:
        return '💪';
    }
  }
}
