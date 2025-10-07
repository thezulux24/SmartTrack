import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hoja-gasto-success-dialog',
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
        <!-- Background with gradient -->
        <div class="relative min-h-[500px] bg-gradient-to-b from-[#10284C] via-[#1a4d5c] to-[#0098A8] rounded-lg overflow-hidden">
          <!-- Background image with overlay -->
          <div class="absolute inset-0 bg-cover bg-center opacity-10"
               [style.background-image]="'url(/02.jpg)'"></div>

          <!-- Content -->
          <div class="relative z-10 flex flex-col h-full min-h-[500px]">
            <!-- Header -->
            <div class="flex items-center p-6">
              <div class="flex items-center gap-2">
                <img 
                  src="https://www.implameq.com/wp-content/uploads/logotipo-impla-300x78.png.webp" 
                  alt="Implameq" 
                  class="h-8 brightness-0 invert" />
              </div>
            </div>

            <!-- Success message card -->
            <div class="flex-1 flex items-center justify-center px-6">
              <div class="w-full max-w-sm bg-[#10284C]/90 backdrop-blur-sm rounded-lg p-8 space-y-4">
                <!-- Success icon -->
                <div class="flex justify-center mb-4">
                  <div class="w-16 h-16 bg-[#CBDD00] rounded-full flex items-center justify-center">
                    <svg class="w-10 h-10 text-[#10284C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>

                <h2 class="text-2xl font-bold text-[#CBDD00] text-center leading-tight">
                  {{ title }}
                </h2>

                @if (hojaNumero) {
                  <p class="text-white text-center text-sm">
                    {{ hojaNumero }}
                  </p>
                }

                <div class="space-y-3 pt-4">
                  <!-- Crear otra button (solo para crear) -->
                  <button *ngIf="showCrearOtraButton"
                    (click)="onCrearOtra()"
                    class="w-full bg-[#CBDD00] hover:bg-[#b5c700] text-[#10284C] font-semibold text-base h-12 rounded-lg transition-colors">
                    Crear otra hoja
                  </button>

                  <!-- Volver button -->
                  <button
                    (click)="onVolver()"
                    [class]="showCrearOtraButton ? 'w-full bg-white/10 hover:bg-white/20 text-white font-semibold text-base h-12 rounded-lg transition-colors border border-white/30' : 'w-full bg-[#CBDD00] hover:bg-[#b5c700] text-[#10284C] font-semibold text-base h-12 rounded-lg transition-colors'">
                    Volver a hojas de gasto
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
export class HojaGastoSuccessDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Hoja de gasto\ncreada\nexitosamente';
  @Input() hojaNumero = '';
  @Input() showCrearOtraButton = false;
  @Output() close = new EventEmitter<void>();
  @Output() crearOtra = new EventEmitter<void>();

  onBackdropClick() {
    this.close.emit();
  }

  onVolver() {
    this.close.emit();
  }

  onCrearOtra() {
    this.crearOtra.emit();
  }
}
