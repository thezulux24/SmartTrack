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
    path: 'logistica',
    loadChildren: () => import('../logistica/logistica-routing').then(m => m.LOGISTICA_ROUTES)
  },

  {
    path: 'trazabilidad',
    loadChildren: () => import('../trazabilidad/trazabilidad-routing').then(m => m.TRAZABILIDAD_ROUTES)
  },

  {
    path: 'tecnico',
    loadChildren: () => import('../tecnico/tecnico-routing').then(m => m.tecnicoRoutes)
  },

  {
    path: 'limpieza',
    loadChildren: () => import('../limpieza/limpieza-routing').then(m => m.limpiezaRoutes)
  },

  {
    path: '**', redirectTo: ''
  }

] as Routes;