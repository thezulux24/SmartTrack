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
  },
  {
    path: 'kits-preparacion',
    loadComponent: () => import('./kits-preparacion-list/kits-preparacion-list.component')
      .then(m => m.KitsPreparacionListComponent),
    canActivate: [internalGuard]
  },
  {
    path: 'kits-listos',
    loadComponent: () => import('./kits-listos-list/kits-listos-list.component')
      .then(m => m.KitsListosListComponent),
    canActivate: [internalGuard]
  },
  {
    path: 'asignar-mensajero/:id',
    loadComponent: () => import('./asignar-mensajero/asignar-mensajero.component')
      .then(m => m.AsignarMensajeroComponent),
    canActivate: [internalGuard]
  },
  {
    path: 'envios-transito',
    loadComponent: () => import('./envios-transito-list/envios-transito-list.component')
      .then(m => m.EnviosTransitoListComponent),
    canActivate: [internalGuard]
  },
  {
    path: 'recepcion-limpieza',
    loadComponent: () => import('./logistica-recepcion-limpieza/logistica-recepcion-limpieza.component')
      .then(m => m.LogisticaRecepcionLimpiezaComponent),
    canActivate: [internalGuard]
  }
];
