import { Routes } from '@angular/router';
import { privateGuard, publicGuard } from './shared/guards/auth.guard';
import { clientGuard, internalGuard } from './shared/guards/role.guard';

export const routes: Routes = [
    {
        path: 'auth',
        canActivate: [publicGuard],
        loadChildren: () => import('./auth/features/auth-shell/auth-routing').then(m => m.default)
    },
    {
        path: 'qr/:codigo',
        loadComponent: () => import('./features/public/qr-validacion/qr-validacion.component')
            .then(m => m.QrValidacionComponent)
    },
    {
        path: 'client',
        canActivate: [privateGuard, clientGuard],
        loadChildren: () => import('./features/client/client-shell/client-routing').then(m => m.default)
    },
    {
        path: 'internal',
        canActivate: [privateGuard, internalGuard],
        loadChildren: () => import('./features/internal/internal-shell/internal-routing').then(m => m.default)
    },
    {
        path: '',
        canActivate: [privateGuard],
        loadChildren: () => import('./features/welcome/welcome-shell/welcome-routing').then(m => m.default)
    }
];