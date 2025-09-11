import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('../internal-home/internal-home.component')
  },

    {
        path: '**', redirectTo: ''
    }

] as Routes;