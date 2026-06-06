import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

// Public landing route guard:
// - Anonymous visitors see the landing page.
// - Authenticated visitors are redirected straight to their dashboard.
export const landingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? router.createUrlTree(['/dashboard'])
    : true;
};
