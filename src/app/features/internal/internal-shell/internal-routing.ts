import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('../internal-home/internal-home.component')
  },

      {
        path: 'inventario',
        loadChildren: () => import('../inventario/inventario-routing'),
    },

    {
        path: '**', redirectTo: ''
    }

] as Routes;