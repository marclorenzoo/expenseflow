import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const addToken = (token: string) =>
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const token = authService.getAccessToken();
  const authReq = token ? addToken(token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isRefreshCall = req.url.includes('/auth/refresh');
      if (error.status !== 401 || isRefreshCall) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newToken) => next(addToken(newToken))),
        catchError((refreshError) => {
          authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
