import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface JwtPayload {
  sub: number;
  username?: string;
  email?: string;
  roles: string[];
  exp: number;
  iat?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly TOKEN_KEY = 'token';
  readonly isLoggedIn = signal(this.hasValidToken());
  readonly username = signal(this.getPayload()?.username ?? null);

  register(data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    goalType: string;
    [key: string]: string | number | null | undefined;
  }) {
    return this.http.post(`${environment.apiUrl}/auth/register`, data);
  }

  login(email: string, password: string) {
    return this.http
      .post<{ token: string }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(({ token }) => {
          localStorage.setItem(this.TOKEN_KEY, token);
          this.isLoggedIn.set(true);
          this.username.set(this.getPayload()?.username ?? null);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.isLoggedIn.set(false);
    this.username.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  isAdmin(): boolean {
    return this.getRoles().includes('ROLE_ADMIN');
  }

  getUserId(): number | null {
    return this.getPayload()?.sub ?? null;
  }

  getUsername(): string | null {
    return this.getPayload()?.username ?? null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private hasValidToken(): boolean {
    const payload = this.getPayload();
    if (!payload) return false;
    return payload.exp * 1000 > Date.now();
  }

  private getRoles(): string[] {
    return this.getPayload()?.roles ?? [];
  }

  private getPayload(): JwtPayload | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return null;

    try {
      const base64 = token.split('.')[1];
      return JSON.parse(atob(base64)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
