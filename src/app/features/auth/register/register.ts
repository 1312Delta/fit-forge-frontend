import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Campos requeridos por el backend
  username = '';
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  goalType = '';

  // Campos opcionales
  birthdate = '';
  heightCm: number | null = null;
  currentWeightKg: number | null = null;

  loading = signal(false);
  errorMessage = signal('');

  onSubmit(): void {
    if (
      !this.username ||
      !this.email ||
      !this.password ||
      !this.firstName ||
      !this.lastName ||
      !this.goalType
    ) {
      this.errorMessage.set('Por favor, rellena todos los campos obligatorios.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const payload = {
      username: this.username,
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      goalType: this.goalType,
      ...(this.birthdate ? { birthdate: this.birthdate } : {}),
      ...(this.heightCm ? { heightCm: this.heightCm } : {}),
      ...(this.currentWeightKg ? { currentWeightKg: this.currentWeightKg } : {}),
    };

    this.auth.register(payload).subscribe({
      next: () => {
        this.loading.set(false);
        // Opcional: auto-login o redirigir al login
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('El email o nombre de usuario ya está en uso.');
        } else if (err.status === 0) {
          this.errorMessage.set('No se pudo conectar con el servidor. (¿CORS?)');
        } else {
          this.errorMessage.set('Error en el registro. Revisa los datos.');
        }
      },
    });
  }
}
