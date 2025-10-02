import { Routes } from '@angular/router';
import { internalGuard } from '../../../shared/guards/role.guard';

export const LOGISTICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./logistica-dashboard/logistica-dashboard.component')
      .then(m => m.LogisticaDashboardComponent),
    canActivate: [internalGuard]
  },
  {
    path: 'kits-pendientes',
    loadComponent: () => import('./kits-pendientes/kits-pendientes-list.component')
      .then(m => m.KitsPendientesListComponent),
    canActivate: [internalGuard]
  },
  {
    path: 'kit-preparacion/:id',
    loadComponent: () => import('./kit-preparacion/kit-preparacion.component')
      .then(m => m.KitPreparacionComponent),
    canActivate: [internalGuard]
  }
];
