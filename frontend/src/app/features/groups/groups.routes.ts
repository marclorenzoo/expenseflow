import { Routes } from '@angular/router';

export const GROUPS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/groups-page/groups-page').then((m) => m.GroupsPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/group-detail-page/group-detail-page').then(
        (m) => m.GroupDetailPage,
      ),
  },
];
