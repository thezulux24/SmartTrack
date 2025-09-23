import { Routes } from '@angular/router';

export const clientesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./clientes-list/clientes-list.component').then(
        (m) => m.ClientesListComponent
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./cliente-form/cliente-form.component').then(
        (m) => m.ClienteFormComponent
      ),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./cliente-form/cliente-form.component').then(
        (m) => m.ClienteFormComponent
      ),
  }
];