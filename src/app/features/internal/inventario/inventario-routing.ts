import { Routes } from "@angular/router";

export default [
    {
        path: '',
        loadComponent: () => import('./inventario-list/inventario-list.component'),
    },

      {
    path: 'nuevo-producto', // ✅ Nueva ruta
    loadComponent: () => import('./producto-form/producto-form.component').then(m => m.ProductoFormComponent)
  },
  {
    path: 'editar-producto/:id', // ✅ Ruta para editar
    loadComponent: () => import('./producto-form/producto-form.component').then(m => m.ProductoFormComponent)
  },
  {
    path: 'movimientos',
    loadComponent: () => import('./inventario-movimientos/inventario-movimientos.component').then(m => m.InventarioMovimientosComponent)
  },


    



        {
        path: '**', redirectTo: ''
    }
] as Routes;