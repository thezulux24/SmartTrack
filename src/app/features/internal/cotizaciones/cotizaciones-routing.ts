import { Routes } from '@angular/router';

export const COTIZACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cotizaciones-list/cotizaciones-list.component').then(m => m.CotizacionesListComponent)
  },
  {
    path: 'nueva',
    loadComponent: () => import('./cotizacion-form/cotizacion-form.component').then(m => m.CotizacionFormComponent)
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./cotizacion-form/cotizacion-form.component').then(m => m.CotizacionFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./cotizacion-detail/cotizacion-detail.component').then(m => m.CotizacionDetailComponent)
  }
];
