import { Routes } from '@angular/router';

export const TRAZABILIDAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./trazabilidad-list/trazabilidad-list.component').then(m => m.TrazabilidadListComponent)
  }
];
