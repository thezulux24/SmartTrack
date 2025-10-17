import { Routes } from '@angular/router';

export const COMERCIAL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./comercial-dashboard/comercial-dashboard.component')
  }
];
