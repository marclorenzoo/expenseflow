import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, map, tap, throwError } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { NotificationsStore } from '@core/stores/notifications.store';
import { environment } from '@environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
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
  private realtime = inject(RealtimeService);
  private notifications = inject(NotificationsStore);

  private readonly API = environment.apiUrl;
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private _error = signal<string | null>(null);
  error = this._error.asReadonly();

  private _user = signal<User | null>(null);
  private _loading = signal<boolean>(false);
  readonly imageVersion = signal(0);

  private decodeToken(token: string): any {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }

  user = this._user.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => this._user() !== null);

  constructor() {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const decoded = this.decodeToken(token);
        // `name` is not a standard JWT claim — the backend may omit it.
        // Store empty string rather than undefined so the UI always has a string.
        this._user.set({
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name ?? '',
        });

        this.realtime.connect(token);

        // Defer to the next microtask so the constructor returns before the
        // authInterceptor calls inject(AuthService). Calling it synchronously
        // inside the constructor triggers Angular's circular-DI detection,
        // which rejects the Promise — silently swallowed by .catch(() => {}).
        // La carga de notificaciones también dispara HTTP (interceptor), así
        // que va en el mismo microtask por el mismo motivo.
        queueMicrotask(() => {
          this.refreshUser().catch(() => {});
          this.notifications.loadNotifications();
        });
      }
    } catch {
      // Malformed token — clear storage so the guard redirects to login
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_KEY);
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
      this._error.set(
        error.error?.message ||
          'No hemos podido crear tu cuenta. Inténtalo de nuevo.',
      );
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
      this._error.set(
        error.error?.message ||
          'No hemos podido iniciar sesión. Comprueba tus datos e inténtalo de nuevo.',
      );
    } finally {
      this._loading.set(false);
    }
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    this._user.set(null);
    this.realtime.disconnect();
    this.notifications.reset();

    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post<{
        accessToken: string;
        refreshToken: string;
      }>(`${this.API}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.accessToken);
          localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
        }),
        map((res) => res.accessToken),
      );
  }

  updateUser(user: User) {
    this._user.set(user);
  }

  async refreshUser(): Promise<void> {
    const updated = await firstValueFrom(
      this.http.get<User>(`${this.API}/users/me`),
    );
    this._user.set(updated);
    this.imageVersion.set(Date.now());
  }

  private handleAuthSuccess(response: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    localStorage.setItem(this.REFRESH_KEY, response.refreshToken);
    this._user.set(response.user);
    this.realtime.connect(response.accessToken);
    this.notifications.loadNotifications();
    const returnUrl =
      this.router.parseUrl(this.router.url).queryParams['returnUrl'] ??
      '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
