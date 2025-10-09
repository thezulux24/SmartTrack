import { Routes } from '@angular/router';

export const limpiezaRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./limpieza-dashboard/limpieza-dashboard.component').then(m => m.LimpiezaDashboardComponent)
  },
  {
    path: 'aprobacion',
    loadComponent: () => import('./aprobacion-limpieza/aprobacion-limpieza.component').then(m => m.AprobacionLimpiezaComponent)
  }
];
