import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { Notification } from '../models/notification.model';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Botón de notificaciones -->
      <button
        (click)="togglePanel()"
        class="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        [class.bg-gray-100]="isPanelOpen()"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        @if (notificationService.unreadCount() > 0) {
          <span class="absolute top-1 right-1 flex h-4 w-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center font-bold">
              {{ notificationService.unreadCount() > 9 ? '9+' : notificationService.unreadCount() }}
            </span>
          </span>
        }
      </button>

      <!-- Panel de notificaciones -->
      @if (isPanelOpen()) {
        <!-- Overlay oscuro en móvil -->
        <div 
          class="fixed inset-0 bg-black/50 z-40 md:hidden"
          (click)="togglePanel()"
        ></div>
        
        <!-- Panel responsive -->
        <div class="
          fixed md:absolute 
          inset-x-0 bottom-0 md:inset-x-auto md:bottom-auto
          md:right-0 md:mt-2 
          w-full md:w-96 
          bg-white 
          rounded-t-2xl md:rounded-lg 
          shadow-2xl border-t md:border border-gray-200 
          z-50 
          max-h-[80vh] md:max-h-[600px] 
          flex flex-col
        ">
          <!-- Header -->
          <div class="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <!-- Indicador visual móvil -->
            <div class="md:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
            
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 text-base md:text-lg">
                Notificaciones
                @if (notificationService.unreadCount() > 0) {
                  <span class="ml-2 text-xs md:text-sm text-gray-500">
                    ({{ notificationService.unreadCount() }} nuevas)
                  </span>
                }
              </h3>
              
              <div class="flex gap-2 items-center">
                @if (notificationService.unreadCount() > 0) {
                  <button
                    (click)="markAllAsRead()"
                    class="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                  >
                    <span class="hidden md:inline">Marcar todas</span>
                    <span class="md:hidden">Marcar</span>
                  </button>
                }
                
                <button
                  (click)="togglePanel()"
                  class="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-3 md:gap-4 mt-3">
              <button
                (click)="activeTab.set('all')"
                class="text-xs md:text-sm font-medium pb-2 border-b-2 transition-colors"
                [class.border-blue-500]="activeTab() === 'all'"
                [class.text-blue-600]="activeTab() === 'all'"
                [class.border-transparent]="activeTab() !== 'all'"
                [class.text-gray-500]="activeTab() !== 'all'"
              >
                Todas ({{ notificationService.allNotifications().length }})
              </button>
              <button
                (click)="activeTab.set('unread')"
                class="text-xs md:text-sm font-medium pb-2 border-b-2 transition-colors"
                [class.border-blue-500]="activeTab() === 'unread'"
                [class.text-blue-600]="activeTab() === 'unread'"
                [class.border-transparent]="activeTab() !== 'unread'"
                [class.text-gray-500]="activeTab() !== 'unread'"
              >
                No leídas ({{ notificationService.unreadCount() }})
              </button>
            </div>
          </div>

          <!-- Lista de notificaciones -->
          <div class="flex-1 overflow-y-auto">
            @if (displayedNotifications().length === 0) {
              <div class="p-8 text-center text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p class="text-sm">No hay notificaciones</p>
              </div>
            } @else {
              @for (notification of displayedNotifications(); track notification.id) {
                <div
                  (click)="handleNotificationClick(notification)"
                  class="p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                  [class.bg-blue-50]="!notification.read"
                >
                  <div class="flex items-start gap-2 md:gap-3">
                    <!-- Icono -->
                    <div 
                      class="text-xl md:text-2xl flex-shrink-0"
                      [ngClass]="notification.icon_color"
                    >
                      {{ notification.icon }}
                    </div>

                    <!-- Contenido -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-2">
                        <h4 
                          class="font-medium text-xs md:text-sm leading-tight"
                          [class.text-gray-900]="!notification.read"
                          [class.text-gray-600]="notification.read"
                        >
                          {{ notification.title }}
                        </h4>
                        @if (!notification.read) {
                          <span class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></span>
                        }
                      </div>
                      
                      <p class="text-[11px] md:text-xs text-gray-600 mt-1 line-clamp-2 leading-snug">
                        {{ notification.message }}
                      </p>
                      
                      <p class="text-[10px] md:text-xs text-gray-400 mt-1.5 md:mt-2">
                        {{ formatDate(notification.created_at) }}
                      </p>
                    </div>

                    <!-- Acciones -->
                    <div class="flex-shrink-0">
                      <button
                        (click)="deleteNotification($event, notification.id)"
                        class="text-gray-400 hover:text-red-600 active:text-red-700 transition-colors p-1 md:p-1.5"
                        title="Eliminar"
                      >
                        <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          @if (notificationService.allNotifications().length > 0) {
            <div class="p-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                (click)="clearAll()"
                class="w-full text-xs md:text-sm text-red-600 hover:text-red-800 active:text-red-900 font-medium py-2 md:py-2.5 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                Limpiar todas
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class NotificationPanelComponent {
  notificationService = inject(NotificationService);
  
  isPanelOpen = signal(false);
  activeTab = signal<'all' | 'unread'>('all');

  displayedNotifications = () => {
    return this.activeTab() === 'all' 
      ? this.notificationService.allNotifications()
      : this.notificationService.unreadNotifications();
  };

  togglePanel() {
    this.isPanelOpen.update(v => !v);
  }

  closePanel() {
    this.isPanelOpen.set(false);
  }

  async handleNotificationClick(notification: Notification) {
    await this.notificationService.navigateToNotification(notification);
    this.closePanel();
  }

  async markAllAsRead() {
    await this.notificationService.markAllAsRead();
  }

  async deleteNotification(event: Event, notificationId: string) {
    event.stopPropagation();
    await this.notificationService.deleteNotification(notificationId);
  }

  async clearAll() {
    if (confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) {
      await this.notificationService.clearAll();
      this.closePanel();
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }
}
