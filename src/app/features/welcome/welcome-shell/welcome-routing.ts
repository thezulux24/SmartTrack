import { Routes } from "@angular/router";

export default [
    {

        path: '',
        loadComponent: () => import('../welcome-home/welcome-home.component'),
    },

    {
        path: '**', redirectTo: ''
    }


] as Routes