import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cliente-success-dialog',
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
        <div class="relative min-h-[600px] bg-gradient-to-b from-[#10284C] via-[#1a4d5c] to-[#0098A8] rounded-lg overflow-hidden">
          <!-- Surgical background image with overlay -->
          <div class="absolute inset-0 bg-cover bg-center opacity-10"
               [style.background-image]="'url(/02.jpg)'"></div>

          <!-- Content -->
          <div class="relative z-10 flex flex-col h-full min-h-[600px]">
            <!-- Header -->
            <div class="flex items-center p-6">
              <div class="flex items-center gap-2">
                <img 
                  src="logo.webp" 
                  alt="Implameq" 
                  class="h-8 brightness-0 invert" />
              </div>
            </div>

            <!-- Success message card -->
            <div class="flex-1 flex items-center justify-center px-6">
              <div class="w-full max-w-sm bg-[#10284C]/90 backdrop-blur-sm rounded-lg p-8 space-y-4">
                <h2 class="text-2xl font-bold text-[#CBDD00] text-center leading-tight">
                  {{ title }}
                </h2>

                <div class="space-y-3">
                  <!-- Volver button -->
                  <button
                    (click)="onVolver()"
                    class="w-full bg-[#CBDD00] hover:bg-[#b5c700] text-[#10284C] font-semibold text-base h-12 rounded-lg transition-colors">
                    Volver
                  </button>

                  <!-- Crear otro cliente button (solo para crear) -->
                  <button *ngIf="showCrearOtroButton"
                    (click)="onCrearOtro()"
                    class="w-full bg-[#CBDD00] hover:bg-[#b5c700] text-[#10284C] font-semibold text-base h-12 rounded-lg transition-colors">
                    Crear otro cliente
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
export class ClienteSuccessDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Operación\nexitosa';
  @Input() showCrearOtroButton = false;
  @Output() close = new EventEmitter<void>();
  @Output() crearOtro = new EventEmitter<void>();

  onBackdropClick() {
    this.close.emit();
  }

  onVolver() {
    this.close.emit();
  }

  onCrearOtro() {
    this.crearOtro.emit();
  }
}
