import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" 
         class="fixed inset-0 z-50 flex items-center justify-center p-4"
         (click)="onBackdropClick()">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      <!-- Dialog Content -->
      <div class="relative z-10 w-full max-w-md" (click)="$event.stopPropagation()">
        <!-- Background with gradient and surgical image -->
        <div class="relative min-h-[400px] bg-gradient-to-b from-[#10284C] via-[#1a4d5c] to-[#0098A8] rounded-lg overflow-hidden">
          <!-- Surgical background image with overlay -->
          <div class="absolute inset-0 bg-cover bg-center opacity-10"
               [style.background-image]="'url(/02.jpg)'"></div>

          <!-- Content -->
          <div class="relative z-10 flex flex-col h-full min-h-[400px]">
            <!-- Header -->
            <div class="flex items-center p-6">
              <div class="flex items-center gap-2">
                <img 
                  src="logo.webp" 
                  alt="Implameq" 
                  class="h-8 brightness-0 invert" />
              </div>
            </div>

            <!-- Confirmation message card -->
            <div class="flex-1 flex items-center justify-center px-6 pb-6">
              <div class="w-full max-w-sm bg-[#10284C]/90 backdrop-blur-sm rounded-lg p-8 space-y-6">
                <div class="space-y-2">
                  <h2 class="text-2xl font-bold text-[#CBDD00] text-center leading-tight">
                    {{ title }}
                  </h2>
                  <p class="text-white text-center text-sm">
                    {{ message }}
                  </p>
                </div>

                <div class="space-y-3">
                  <button
                    (click)="onConfirm()"
                    [class]="confirmButtonClass"
                    class="w-full font-semibold text-base h-12 rounded-lg transition-colors">
                    {{ confirmText }}
                  </button>
                  <button
                    (click)="onCancel()"
                    class="w-full bg-white hover:bg-gray-100 text-[#10284C] font-semibold text-base h-12 rounded-lg transition-colors border-2 border-[#0098A8]">
                    {{ cancelText }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = '¿Confirmar acción?';
  @Input() message = '¿Está seguro que desea realizar esta acción?';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onBackdropClick() {
    this.cancel.emit();
  }

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
