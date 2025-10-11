import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 

import { Router } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';
import { ChatService } from '../../../shared/services/chat.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { NotificationPanelComponent } from '../../../shared/components/notification-panel.component';
import { NotificationToastComponent } from '../../../shared/components/notification-toast.component';

@Component({
  selector: 'app-internal-home',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationPanelComponent, NotificationToastComponent],
  templateUrl: './internal-home.component.html',
  styleUrl: './internal-home.component.css'
})
export default class InternalHomeComponent implements OnInit {

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _chatService = inject(ChatService);
  notificationService = inject(NotificationService);

  totalUnreadMessages = signal(0);

  async ngOnInit() {
    await this.loadUnreadMessagesCount();
    await this.initializeNotifications();
    
    // Actualizar cada 30 segundos
    setInterval(() => {
      this.loadUnreadMessagesCount();
    }, 30000);
  }

  async initializeNotifications() {
    try {
      const { data } = await this._authService.session();
      if (data?.session?.user) {
        await this.notificationService.initialize(data.session.user.id);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async loadUnreadMessagesCount() {
    try {
      await this._chatService.actualizarUnreadCounts();
      this._chatService.unreadCounts$.subscribe(counts => {
        const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
        this.totalUnreadMessages.set(total);
      });
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  }

  async logout() {
    await this._authService.logOut();
    this._router.navigate(['/auth/log-in']);
  }

  async navigateToAgenda() {
    this._router.navigate(['/agenda']);
  }

  async navigateToInventario() {
    this._router.navigate(['/inventario']);
  }

}