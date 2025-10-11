import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(400px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(400px)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div class="fixed top-4 right-4 left-4 md:left-auto z-50 space-y-2 max-w-md md:max-w-md mx-auto md:mx-0">
      @for (toast of notificationService.activeToasts(); track toast.id) {
        <div 
          class="bg-white rounded-lg shadow-2xl border-l-4 overflow-hidden transform transition-all duration-300 hover:scale-[1.02] active:scale-100 cursor-pointer"
          [ngClass]="getBorderColor(toast.priority)"
          (click)="handleToastClick(toast)"
          @slideIn
        >
          <div class="p-3 md:p-4 flex items-start gap-2 md:gap-3">
            <!-- Icono -->
            <div 
              class="text-xl md:text-2xl flex-shrink-0"
              [ngClass]="toast.icon_color"
            >
              {{ toast.icon }}
            </div>

            <!-- Contenido -->
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-gray-900 text-xs md:text-sm mb-1 truncate">
                {{ toast.title }}
              </h4>
              <p class="text-gray-600 text-[11px] md:text-xs line-clamp-2 leading-snug">
                {{ toast.message }}
              </p>
            </div>

            <!-- Botón cerrar -->
            <button
              (click)="closeToast($event, toast.id)"
              class="flex-shrink-0 text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors p-1"
            >
              <svg class="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- Barra de progreso -->
          <div class="h-1 bg-gray-100">
            <div 
              class="h-full transition-all duration-[5000ms] ease-linear"
              [ngClass]="getProgressColor(toast.priority)"
              style="width: 0%; animation: progressBar 5s linear;"
            ></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes progressBar {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class NotificationToastComponent {
  notificationService = inject(NotificationService);
  private router = inject(Router);

  getBorderColor(priority: string): string {
    const colors = {
      low: 'border-gray-400',
      medium: 'border-blue-500',
      high: 'border-orange-500',
      urgent: 'border-red-500'
    };
    return colors[priority as keyof typeof colors] || 'border-gray-400';
  }

  getProgressColor(priority: string): string {
    const colors = {
      low: 'bg-gray-400',
      medium: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-400';
  }

  async handleToastClick(toast: any) {
    // Navegar a la notificación
    await this.notificationService.navigateToNotification(toast);
    // Cerrar el toast
    this.notificationService.removeToast(toast.id);
  }

  closeToast(event: Event, toastId: string) {
    event.stopPropagation();
    this.notificationService.removeToast(toastId);
  }
}
