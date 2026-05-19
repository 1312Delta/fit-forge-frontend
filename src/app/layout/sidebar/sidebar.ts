import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <!-- Logo -->
    <a routerLink="/dashboard" class="sb-brand"> Fit<span class="sb-brand-accent">Forge</span> </a>

    <!-- Navigation -->
    <nav class="sb-nav">
      <!-- Principal -->
      <div class="sb-group-label">PRINCIPAL</div>
      <a
        routerLink="/dashboard"
        routerLinkActive="sb-active"
        [routerLinkActiveOptions]="{ exact: true }"
        class="sb-link"
      >
        <span class="sb-icon">⊞</span>
        Dashboard
      </a>
      <a routerLink="/stats" routerLinkActive="sb-active" class="sb-link">
        <span class="sb-icon">📈</span>
        Estadísticas
      </a>

      <!-- Entreno -->
      <div class="sb-group-label">ENTRENO</div>
      <a
        routerLink="/workouts"
        routerLinkActive="sb-active"
        [routerLinkActiveOptions]="{ exact: true }"
        class="sb-link"
      >
        <span class="sb-icon">🏋️</span>
        Entrenamientos
        <span class="sb-badge">3</span>
      </a>
      <a routerLink="/workouts/history" routerLinkActive="sb-active" class="sb-link">
        <span class="sb-icon">📋</span>
        Mis rutinas
      </a>

      <!-- Nutrición -->
      <div class="sb-group-label">NUTRICIÓN</div>
      <a routerLink="/nutrition" routerLinkActive="sb-active" class="sb-link">
        <span class="sb-icon">🍽️</span>
        Dieta
      </a>
      <a routerLink="/stats/weight" routerLinkActive="sb-active" class="sb-link">
        <span class="sb-icon">⚖️</span>
        Peso corporal
      </a>
    </nav>

    <!-- Spacer -->
    <div class="sb-spacer"></div>

    <!-- Divider -->
    <div class="sb-divider"></div>

    <!-- User profile -->
    <div class="sb-user">
      <div class="sb-avatar">{{ initials() }}</div>
      <div class="sb-user-info">
        <div class="sb-user-name">{{ displayName() }}</div>
      </div>
    </div>

    <!-- Logout -->
    <button class="sb-logout" (click)="auth.logout()">↩ Cerrar sesión</button>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        width: 220px;
        min-width: 220px;
        height: 100vh;
        position: sticky;
        top: 0;
        background: var(--color-surface);
        border-right: 1px solid var(--color-border);
        padding: 1.5rem 1rem 1.25rem;
        overflow-y: auto;
      }

      /* ── Brand ──────────────────────────────────── */
      .sb-brand {
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 1.45rem;
        color: var(--color-text);
        text-decoration: none;
        letter-spacing: -0.5px;
        margin-bottom: 1.75rem;
        display: block;
      }
      .sb-brand-accent {
        color: var(--color-primary);
      }

      /* ── Nav ────────────────────────────────────── */
      .sb-nav {
        display: flex;
        flex-direction: column;
      }

      .sb-group-label {
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        color: var(--color-text-muted);
        margin: 1.1rem 0 0.45rem 0.55rem;
      }

      .sb-group-label:first-child {
        margin-top: 0;
      }

      .sb-link {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.55rem 0.65rem;
        border-radius: var(--radius-md);
        font-size: 0.88rem;
        color: var(--color-text-muted);
        text-decoration: none;
        transition:
          background 0.15s,
          color 0.15s;
        position: relative;
      }

      .sb-link:hover {
        background: var(--color-surface-2);
        color: var(--color-text);
      }

      .sb-link.sb-active {
        background: var(--color-surface-2);
        color: var(--color-text);
        font-weight: 500;
      }

      .sb-icon {
        font-size: 0.95rem;
        width: 20px;
        text-align: center;
        flex-shrink: 0;
      }

      .sb-badge {
        margin-left: auto;
        background: var(--color-primary);
        color: #fff;
        font-size: 0.62rem;
        font-weight: 700;
        padding: 0.1rem 0.45rem;
        border-radius: var(--radius-pill);
        line-height: 1.4;
      }

      /* ── Spacer & divider ──────────────────────── */
      .sb-spacer {
        flex: 1;
      }

      .sb-divider {
        height: 1px;
        background: var(--color-border);
        margin: 0.75rem 0;
      }

      /* ── User ───────────────────────────────────── */
      .sb-user {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.35rem 0;
      }

      .sb-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--color-primary);
        color: #fff;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 0.78rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .sb-user-name {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text);
      }

      .sb-logout {
        width: 100%;
        margin-top: 0.5rem;
        padding: 0.45rem 0.65rem;
        border: none;
        border-radius: var(--radius-md);
        background: transparent;
        color: var(--color-text-muted);
        font-size: 0.84rem;
        text-align: left;
        cursor: pointer;
        transition:
          background 0.15s,
          color 0.15s;
      }

      .sb-logout:hover {
        background: var(--color-surface-2);
        color: var(--color-danger, #e53935);
      }

      /* ── Responsive: hide on mobile ─────────────── */
      @media (max-width: 991px) {
        :host {
          display: none;
        }
      }
    `,
  ],
})
export class Sidebar {
  protected auth = inject(AuthService);
  private readonly ds = inject(DashboardService);
  private readonly greeting = this.ds.getGreeting();
  readonly displayName = computed(() => this.greeting().userName);
  readonly initials = computed(() => this.displayName().slice(0, 2).toUpperCase());
}
