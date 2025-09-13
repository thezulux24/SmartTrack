import { Routes } from "@angular/router";

export default [
    {
        path: '',
        loadComponent: () => import('./inventario-list/inventario-list.component'),
    },
    {
        path: 'movimientos',
        loadComponent: () => import('./inventario-movimientos/inventario-movimientos.component'),
    },

        {
        path: '**', redirectTo: ''
    }
] as Routes;