import { Routes } from '@angular/router';

export const chatRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./chat-list/chat-list.component').then(m => m.ChatListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./chat-cirugia/chat-cirugia.component').then(m => m.ChatCirugiaComponent)
  }
];
