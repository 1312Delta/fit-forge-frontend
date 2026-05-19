import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sidebar],
  template: `
    <div class="app-shell">
      <!-- Desktop sidebar -->
      <app-sidebar />

      <div class="app-main-col">
        <!-- Mobile top bar (only visible ≤991px) -->
        <header class="mob-topbar">
          <a routerLink="/dashboard" class="mob-brand">
            Fit<span class="mob-brand-accent">Forge</span>
          </a>
          <button
            class="mob-hamburger"
            [class.is-open]="mobileOpen()"
            (click)="toggleMobile()"
            aria-label="Abrir menú"
          >
            <span class="mob-line"></span>
            <span class="mob-line"></span>
          </button>
        </header>

        <!-- Mobile overlay panel -->
        <div
          class="mob-overlay"
          [class.is-open]="mobileOpen()"
          (click)="closeMobile()"
          tabindex="0"
          (keydown.enter)="closeMobile()"
        >
          <nav
            class="mob-panel"
            [class.is-open]="mobileOpen()"
            (click)="$event.stopPropagation()"
            tabindex="0"
            (keydown.enter)="$event.stopPropagation()"
          >
            <!-- Principal -->
            <div class="mob-group">PRINCIPAL</div>
            <a
              routerLink="/dashboard"
              routerLinkActive="mob-active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="mob-link"
              (click)="closeMobile()"
              >Dashboard</a
            >
            <a
              routerLink="/stats"
              routerLinkActive="mob-active"
              class="mob-link"
              (click)="closeMobile()"
              >Estadísticas</a
            >

            <!-- Entreno -->
            <div class="mob-group">ENTRENO</div>
            <a
              routerLink="/workouts"
              routerLinkActive="mob-active"
              class="mob-link"
              (click)="closeMobile()"
              >Entrenamientos</a
            >
            <a
              routerLink="/workouts/history"
              routerLinkActive="mob-active"
              class="mob-link"
              (click)="closeMobile()"
              >Mis rutinas</a
            >

            <!-- Nutrición -->
            <div class="mob-group">NUTRICIÓN</div>
            <a
              routerLink="/nutrition"
              routerLinkActive="mob-active"
              class="mob-link"
              (click)="closeMobile()"
              >Dieta</a
            >
            <a
              routerLink="/stats/weight"
              routerLinkActive="mob-active"
              class="mob-link"
              (click)="closeMobile()"
              >Peso corporal</a
            >

            <!-- User -->
            <div class="mob-divider"></div>
            <div class="mob-user">
              <div class="mob-avatar">{{ initials() }}</div>
              <div>
                <div class="mob-user-name">{{ displayName() }}</div>
              </div>
            </div>
            <button class="mob-logout" (click)="auth.logout()">↩ Cerrar sesión</button>
          </nav>
        </div>

        <!-- Page content -->
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      /* ── Shell ──────────────────────────────────── */
      .app-shell {
        display: flex;
        min-height: 100vh;
        background-color: var(--color-bg);
      }

      .app-main-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      .main-content {
        flex: 1;
      }

      /* ══════════════════════════════════════════════
         MOBILE TOP BAR — hidden on desktop
         ══════════════════════════════════════════════ */
      .mob-topbar {
        display: none;
      }

      @media (max-width: 991px) {
        .mob-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 200;
        }
      }

      .mob-brand {
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 1.35rem;
        color: var(--color-text);
        text-decoration: none;
        letter-spacing: -0.5px;
      }
      .mob-brand-accent {
        color: var(--color-primary);
      }

      /* ── Hamburger (animated X) ─────────────────── */
      .mob-hamburger {
        width: 36px;
        height: 36px;
        background: none;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 0;
        transition: border-color 0.2s;
      }

      .mob-hamburger:hover {
        border-color: rgba(255, 255, 255, 0.25);
      }

      .mob-line {
        display: block;
        width: 18px;
        height: 2px;
        background: var(--color-text);
        border-radius: 2px;
        transition:
          transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          opacity 0.2s ease;
        transform-origin: center;
      }

      .mob-hamburger.is-open .mob-line:first-child {
        transform: translateY(3.5px) rotate(45deg);
      }
      .mob-hamburger.is-open .mob-line:last-child {
        transform: translateY(-3.5px) rotate(-45deg);
      }

      /* ══════════════════════════════════════════════
         MOBILE OVERLAY + PANEL
         ══════════════════════════════════════════════ */
      .mob-overlay {
        display: none;
      }

      @media (max-width: 991px) {
        .mob-overlay {
          display: block;
          position: fixed;
          inset: 0;
          top: 55px; /* below topbar */
          z-index: 190;
          background: rgba(0, 0, 0, 0);
          pointer-events: none;
          transition: background 0.35s ease;
        }

        .mob-overlay.is-open {
          background: rgba(0, 0, 0, 0.5);
          pointer-events: all;
        }

        .mob-panel {
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          padding: 1.5rem 1.75rem 1.75rem;
          transform: translateY(-105%);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          max-height: calc(100vh - 55px);
          overflow-y: auto;
        }

        .mob-panel.is-open {
          transform: translateY(0);
        }
      }

      /* ── Nav links ──────────────────────────────── */
      .mob-group {
        font-size: 0.6rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        color: var(--color-text-muted);
        margin: 1.25rem 0 0.35rem;
      }
      .mob-group:first-child {
        margin-top: 0;
      }

      .mob-link {
        display: block;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.35rem;
        color: var(--color-text-muted);
        text-decoration: none;
        padding: 0.45rem 0;
        transition: color 0.15s;
      }

      .mob-link:hover,
      .mob-link.mob-active {
        color: var(--color-text);
      }

      /* ── Divider & user ─────────────────────────── */
      .mob-divider {
        height: 1px;
        background: var(--color-border);
        margin: 1.25rem 0;
      }

      .mob-user {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .mob-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--color-primary);
        color: #fff;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 0.82rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .mob-user-name {
        font-weight: 600;
        font-size: 0.92rem;
        color: var(--color-text);
      }

      .mob-logout {
        margin-top: 0.75rem;
        width: 100%;
        padding: 0.5rem 0;
        background: transparent;
        border: none;
        text-align: left;
        font-size: 0.9rem;
        color: var(--color-text-muted);
        cursor: pointer;
        transition: color 0.15s;
      }

      .mob-logout:hover {
        color: var(--color-danger, #e53935);
      }
    `,
  ],
})
export class MainLayout {
  protected auth = inject(AuthService);
  private readonly ds = inject(DashboardService);
  private readonly greeting = this.ds.getGreeting();
  readonly displayName = computed(() => this.greeting().userName);
  readonly initials = computed(() => this.displayName().slice(0, 2).toUpperCase());

  mobileOpen = signal(false);

  toggleMobile() {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }
}
