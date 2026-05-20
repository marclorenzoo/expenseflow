import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API = 'http://localhost:3000/api';
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private _error = signal<string | null>(null);
  error = this._error.asReadonly();

  private _user = signal<User | null>(null);
  private _loading = signal<boolean>(false);

  private decodeToken(token: string): any {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }

  user = this._user.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => this._user() !== null);

  constructor() {
    const token = localStorage.getItem('access_token');

    if (token) {
      const decoded = this.decodeToken(token);
      this._user.set({
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
      });
    }
  }

  async register(name: string, email: string, password: string) {
    this._loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API}/auth/register`, {
          name,
          email,
          password,
        }),
      );
      this.handleAuthSuccess(response);
    } catch (error: any) {
      this._error.set(error.error?.message || 'Something went wrong');
    } finally {
      this._loading.set(false);
    }
  }

  async login(email: string, password: string) {
    this._loading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API}/auth/login`, {
          email,
          password,
        }),
      );
      this.handleAuthSuccess(response);
    } catch (error: any) {
      this._error.set(error.error?.message || 'Something went wrong');
    } finally {
      this._loading.set(false);
    }
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private handleAuthSuccess(response: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    localStorage.setItem(this.REFRESH_KEY, response.refreshToken);
    this._user.set(response.user);
    this.router.navigate(['/dashboard']);
  }
}
