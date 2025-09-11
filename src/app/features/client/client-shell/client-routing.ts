import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('../client-home/client-home.component')
    },

    {
        path: '**', redirectTo: ''
    }

]as Routes;
