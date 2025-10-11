import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 

import { Router } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';
import { ChatService } from '../../../shared/services/chat.service';

@Component({
  selector: 'app-internal-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './internal-home.component.html',
  styleUrl: './internal-home.component.css'
})
export default class InternalHomeComponent implements OnInit {

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _chatService = inject(ChatService);

  totalUnreadMessages = signal(0);

  ngOnInit(): void {
    this.loadUnreadMessagesCount();
    
    // Actualizar cada 30 segundos
    setInterval(() => {
      this.loadUnreadMessagesCount();
    }, 30000);
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