import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./hoja-gasto-list/hoja-gasto-list.component').then(c => c.HojaGastoListComponent),
    title: 'Hojas de Gasto - SmartTrack'
  },
  {
    path: 'list',
    loadComponent: () => import('./hoja-gasto-list/hoja-gasto-list.component').then(c => c.HojaGastoListComponent),
    title: 'Hojas de Gasto - SmartTrack'
  },
  {
    path: 'new',
    loadComponent: () => import('./hoja-gasto-form/hoja-gasto-form.component').then(c => c.HojaGastoFormComponent),
    title: 'Nueva Hoja de Gasto - SmartTrack'
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./hoja-gasto-detail/hoja-gasto-detail.component').then(c => c.HojaGastoDetailComponent),
    title: 'Detalle Hoja de Gasto - SmartTrack'
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./hoja-gasto-form/hoja-gasto-form.component').then(c => c.HojaGastoFormComponent),
    title: 'Editar Hoja de Gasto - SmartTrack'
  }
] as Routes;