import { Routes } from '@angular/router';

export const tecnicoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tecnico-dashboard/tecnico-dashboard.component').then(m => m.TecnicoDashboardComponent)
  },
  {
    path: 'validar-kit/:id',
    loadComponent: () => import('./tecnico-validacion-kit/tecnico-validacion-kit.component').then(m => m.TecnicoValidacionKitComponent)
  }
];
