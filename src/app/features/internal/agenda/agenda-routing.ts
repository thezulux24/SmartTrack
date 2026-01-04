import { Routes } from '@angular/router';
import { AgendaTecnicoComponent } from './agenda-tecnico/agenda-tecnico.component';

export const AGENDA_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'lista',
    pathMatch: 'full'
  },
  {
    path: 'lista',
    loadComponent: () => import('./agenda-list/agenda-list.component').then(c => c.AgendaListComponent)
  },
  {
    path: 'calendario',
    loadComponent: () => import('./components/agenda-calendar/agenda-calendar.component').then(c => c.AgendaCalendarComponent)
  },
  {
    path: 'nueva',
    loadComponent: () => import('./cirugia-form/cirugia-form.component').then(c => c.CirugiaFormComponent)
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./cirugia-form/cirugia-form.component').then(c => c.CirugiaFormComponent)
  },
  {
    path: 'detalle/:id',
    loadComponent: () => import('./cirugia-detail/cirugia-detail.component').then(c => c.CirugiaDetailComponent)
  },
  {
    path: 'kit-builder/:id',
    loadComponent: () => import('./kit-builder/kit-builder.component').then(c => c.KitBuilderComponent)
  },
  {
    path: 'kit-builder/:id/edit',
    loadComponent: () => import('./kit-builder/kit-builder.component').then(c => c.KitBuilderComponent)
  },
  {
    path: 'kit-detail/:id',
    loadComponent: () => import('./kit-detail/kit-detail.component').then(c => c.KitDetailComponent)
  },

  { path: 'mi-agenda', loadComponent: () => import('./agenda-tecnico/agenda-tecnico.component').then(c => c.AgendaTecnicoComponent) }, // Nueva ruta para técnicos


  
];