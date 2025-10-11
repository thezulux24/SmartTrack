import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block">
      <ng-content></ng-content>
      
      @if (count() > 0) {
        <div 
          class="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold text-white shadow-lg animate-pulse"
          [ngClass]="getBadgeColor()"
        >
          {{ displayCount() }}
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes pulse-scale {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    .animate-pulse {
      animation: pulse-scale 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `]
})
export class NotificationBadgeComponent {
  count = input<number>(0);
  maxDisplay = input<number>(99);
  color = input<'primary' | 'danger' | 'warning' | 'success'>('danger');
  
  onClick = output<void>();

  displayCount() {
    const c = this.count();
    const max = this.maxDisplay();
    return c > max ? `${max}+` : c.toString();
  }

  getBadgeColor(): string {
    const colors = {
      primary: 'bg-blue-500',
      danger: 'bg-red-500',
      warning: 'bg-orange-500',
      success: 'bg-green-500'
    };
    return colors[this.color()];
  }
}
