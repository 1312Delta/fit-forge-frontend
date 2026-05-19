import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../services/stats.service';
import { StatTile } from '../../../shared/components/stat-tile/stat-tile';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { Badge } from '../../../shared/components/badge/badge';

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

  newWeight = '';
  newDate = new Date().toISOString().split('T')[0];
  newNotes = '';

  readonly chartData = computed(() => {
    const data = this.history();
    if (!data.length) return null;

    const sorted = [...data].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
    );

    const w = 1000;
    const h = 300;
    const padding = 40;

    const weights = sorted.map((d) => Number(d.weightKg));
    const minW = Math.max(0, Math.min(...weights) - 2);
    const maxW = Math.max(...weights) + 2;
    const rangeW = maxW - minW || 1;

    const firstDate = new Date(sorted[0].loggedAt).getTime();
    const lastDate = new Date(sorted[sorted.length - 1].loggedAt).getTime();
    const rangeTime = lastDate - firstDate || 1;

    const points = sorted.map((d) => {
      const time = new Date(d.loggedAt).getTime();
      const x = padding + ((time - firstDate) / rangeTime) * (w - padding * 2);

      const finalX = sorted.length === 1 ? w / 2 : x;
      const finalY = h - padding - ((Number(d.weightKg) - minW) / rangeW) * (h - padding * 2);

      return { x: finalX, y: finalY, date: d.loggedAt, weight: Number(d.weightKg) };
    });

    const dLine = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    return { points, dLine, minW, maxW, viewBox: `0 0 ${w} ${h}` };
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

  getDiff(currentIdx: number): number | null {
    const list = this.sortedHistoryDesc();
    if (currentIdx >= list.length - 1) return null;
    const curr = Number(list[currentIdx].weightKg);
    const prev = Number(list[currentIdx + 1].weightKg);
    return curr - prev;
  }
}
