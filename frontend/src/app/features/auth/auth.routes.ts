import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./auth-shell/auth-shell').then((m) => m.AuthShell),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login-page/login-page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/register-page/register-page').then(
            (m) => m.RegisterPage,
          ),
      },
    ],
  },
];
