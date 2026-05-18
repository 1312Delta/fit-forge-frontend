import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
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
