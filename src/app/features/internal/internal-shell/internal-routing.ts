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
    path: 'agenda',
    loadChildren: () => import('../agenda/agenda-routing').then(m => m.AGENDA_ROUTES)
  },

    {
    path: 'clientes',
    loadChildren: () => import('../clientes/clientes-routing').then(m => m.clientesRoutes),
  },

  {
    path: 'hojas-gasto',
    loadChildren: () => import('../hojas-gasto/hojas-gasto-routing')
  },

    {
        path: '**', redirectTo: ''
    }

] as Routes;