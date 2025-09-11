import { Routes } from '@angular/router';
import { privateGuard, publicGuard } from './shared/guards/auth.guard';

export const routes: Routes = [

    {
        path: 'auth',
        canActivate: [publicGuard],
        loadChildren: () => import('./auth/features/auth-shell/auth-routing').then(m => m.default)
    },

        {
        path: '',
        canActivate: [privateGuard],
        loadChildren: () => import('./features/welcome/welcome-shell/welcome-routing').then(m => m.default)
    }
];
