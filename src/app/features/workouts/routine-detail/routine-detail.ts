import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Badge } from '../../../shared/components/badge/badge';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { StatTile } from '../../../shared/components/stat-tile/stat-tile';
import { WorkoutsService } from '../services/workouts.service';

@Component({
  selector: 'app-routine-detail',
  imports: [RouterLink, Badge, SectionCard, StatTile],
  templateUrl: './routine-detail.html',
  styleUrl: './routine-detail.scss',
})
export class RoutineDetail {
  private readonly ws = inject(WorkoutsService);
  private readonly route = inject(ActivatedRoute);

  readonly id = this.route.snapshot.paramMap.get('id') ?? '1';
  readonly routine = this.ws.getRoutineById(this.id);

  levelLabel(level: string): string {
    const map: Record<string, string> = { easy: 'Fácil', mid: 'Medio', hard: 'Duro' };
    return map[level] ?? level;
  }

  formatRest(sec: number): string {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}min ${sec % 60 ? (sec % 60) + 's' : ''}`.trim();
  }
}
