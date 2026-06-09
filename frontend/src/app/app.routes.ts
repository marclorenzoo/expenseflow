import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { landingGuard } from '@core/guards/landing.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    loadComponent: () =>
      import('./features/landing/pages/landing-page/landing-page').then(
        (m) => m.LandingPage,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./ui/layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'groups',
        loadChildren: () =>
          import('./features/groups/groups.routes').then(
            (m) => m.GROUPS_ROUTES,
          ),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then(
            (m) => m.PROFILE_ROUTES,
          ),
      },
      {
        path: 'analytics',
        loadChildren: () =>
          import('./features/analytics/analytics.routes').then(
            (m) => m.ANALYTICS_ROUTES,
          ),
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
