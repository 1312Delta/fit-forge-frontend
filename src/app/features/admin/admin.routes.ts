import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-panel/admin-panel').then((m) => m.AdminPanel),
  },
];
