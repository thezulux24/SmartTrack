import { Routes } from '@angular/router';
import { roleBasedGuard } from '../../../shared/guards/role.guard';

export default [
  {
    path: '',
    loadComponent: () => import('../internal-home/internal-home.component')
  },

  {
    path: 'inventario',
    canActivate: [roleBasedGuard], // ✅ Logística + Admin
    loadChildren: () => import('../inventario/inventario-routing'),
  },

  {
    path: 'agenda',
    canActivate: [roleBasedGuard], // ✅ Comercial, Soporte Técnico, Logística + Admin
    loadChildren: () => import('../agenda/agenda-routing').then(m => m.AGENDA_ROUTES)
  },

  {
    path: 'clientes',
    canActivate: [roleBasedGuard], // ✅ Comercial, Logística + Admin
    loadChildren: () => import('../clientes/clientes-routing').then(m => m.clientesRoutes),
  },

  {
    path: 'hojas-gasto',
    canActivate: [roleBasedGuard], // ✅ Comercial, Soporte Técnico + Admin
    loadChildren: () => import('../hojas-gasto/hojas-gasto-routing')
  },

  {
    path: 'cotizaciones',
    canActivate: [roleBasedGuard], // ✅ Solo Comercial + Admin
    loadChildren: () => import('../cotizaciones/cotizaciones-routing').then(m => m.COTIZACIONES_ROUTES)
  },

  {
    path: 'comercial',
    canActivate: [roleBasedGuard], // ✅ Solo Comercial + Admin
    loadChildren: () => import('../comercial/comercial-routing').then(m => m.COMERCIAL_ROUTES)
  },

  {
    path: 'logistica',
    canActivate: [roleBasedGuard], // ✅ Solo Logística + Admin
    loadChildren: () => import('../logistica/logistica-routing').then(m => m.LOGISTICA_ROUTES)
  },

  {
    path: 'trazabilidad',
    canActivate: [roleBasedGuard], // ✅ Comercial, Logística, Soporte Técnico + Admin
    loadChildren: () => import('../trazabilidad/trazabilidad-routing').then(m => m.TRAZABILIDAD_ROUTES)
  },

  {
    path: 'tecnico',
    canActivate: [roleBasedGuard], // ✅ Solo Soporte Técnico + Admin
    loadChildren: () => import('../tecnico/tecnico-routing').then(m => m.tecnicoRoutes)
  },

  {
    path: 'limpieza',
    canActivate: [roleBasedGuard], // ✅ Solo Soporte Técnico + Admin
    loadChildren: () => import('../limpieza/limpieza-routing').then(m => m.limpiezaRoutes)
  },

  {
    path: 'chat',
    canActivate: [roleBasedGuard], // ✅ Comercial, Logística, Soporte Técnico + Admin
    loadChildren: () => import('../chat/chat-routing').then(m => m.chatRoutes)
  },

  {
    path: '**', redirectTo: ''
  }

] as Routes;