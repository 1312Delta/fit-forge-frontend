import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-card">
      <a routerLink="/" class="auth-home">Volver al inicio</a>

      <h1 class="auth-title">Iniciar sesión</h1>
      <p class="auth-subtitle">Accede a tu cuenta de FitForge</p>

      @if (errorMessage()) {
        <div class="auth-error">{{ errorMessage() }}</div>
      }

      <form (ngSubmit)="onSubmit()" class="auth-form">
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            type="email"
            class="form-input"
            [(ngModel)]="email"
            name="email"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Contraseña</label>
          <input
            id="password"
            type="password"
            class="form-input"
            [(ngModel)]="password"
            name="password"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="auth-btn" [disabled]="loading()">
          @if (loading()) {
            Entrando...
          } @else {
            Entrar
          }
        </button>
      </form>

      <p class="auth-footer">
        ¿No tienes cuenta?
        <a routerLink="/register" class="auth-link">Regístrate</a>
      </p>
    </div>
  `,
  styles: [
    `
      .auth-card {
        width: 100%;
        max-width: 420px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: 2.5rem 2rem;
      }

      .auth-home {
        display: inline-flex;
        color: var(--color-primary);
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
        margin-bottom: 1.5rem;

        &:hover {
          text-decoration: underline;
        }
      }

      .auth-title {
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 1.75rem;
        color: var(--color-text);
        margin: 0 0 0.5rem;
      }

      .auth-subtitle {
        color: var(--color-text-muted);
        font-size: 0.9rem;
        margin: 0 0 2rem;
      }

      .auth-error {
        background: var(--color-hard-bg);
        border: 1px solid rgba(226, 75, 74, 0.3);
        color: var(--color-danger);
        font-size: 0.85rem;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-md);
        margin-bottom: 1.5rem;
      }

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .form-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-muted);
        letter-spacing: 0.03em;
      }

      .form-input {
        background: var(--color-surface-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 0.75rem 1rem;
        color: var(--color-text);
        font-size: 0.9rem;
        font-family: var(--font-body);
        outline: none;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;

        &::placeholder {
          color: var(--color-text-disabled);
        }

        &:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(29, 158, 117, 0.15);
        }
      }

      .auth-btn {
        margin-top: 0.5rem;
        background: var(--color-primary);
        color: #fff;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 0.95rem;
        padding: 0.8rem;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition:
          background 0.2s,
          transform 0.1s;

        &:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }

        &:active:not(:disabled) {
          transform: scale(0.98);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .auth-footer {
        text-align: center;
        margin-top: 1.5rem;
        color: var(--color-text-muted);
        font-size: 0.85rem;
      }

      .auth-link {
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 600;

        &:hover {
          text-decoration: underline;
        }
      }
    `,
  ],
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal('');

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor, rellena todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Email o contraseña incorrectos.');
        } else if (err.status === 0) {
          this.errorMessage.set('No se pudo conectar con el servidor. (¿CORS?)');
        } else {
          this.errorMessage.set('Error inesperado. Inténtalo de nuevo.');
        }
      },
    });
  }
}
