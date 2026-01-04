import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-estado-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <!-- Overlay -->
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
           (click)="onClose()">
        <!-- Dialog -->
        <div class="bg-gradient-to-b from-[#0098A8] to-[#10284C] rounded-2xl max-w-md w-full p-0 shadow-2xl"
             (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="relative p-6 pb-4">
            <!-- Logo -->
            <div class="flex justify-center mb-4">
              <div class="text-center">
                <img src="logo.webp" 
                     alt="Implameq" class="h-12 mx-auto mb-2 brightness-0 invert">
                <p class="text-xs text-white/80">Implantes médicos - Quirúrgicos</p>
              </div>
            </div>

            <!-- Title -->
            <h2 class="text-center text-white text-xl font-semibold">Cambio de Estado</h2>
          </div>

          <!-- Status selection card -->
          <div class="px-6 pb-6">
            <div class="bg-transparent border-2 border-white rounded-lg p-4 space-y-3 mb-6">
              @for (status of statuses; track status.value) {
                <button
                  type="button"
                  (click)="selectStatus(status.value)"
                  [disabled]="status.value === 'completada' || status.value === 'cancelada'"
                  [class]="'w-full py-3 px-4 rounded-md font-semibold transition-all ' +
                          (selectedStatus === status.value 
                            ? 'bg-[#CBDD00] ring-2 ring-white text-[#10284C]' 
                            : 'bg-[#CBDD00] hover:bg-[#d4e61a] text-[#10284C]') +
                          (status.value === 'completada' || status.value === 'cancelada'
                            ? ' opacity-50 cursor-not-allowed'
                            : '')">
                  {{ status.label }}
                </button>
              }
            </div>

            <!-- Action buttons -->
            <div class="space-y-3">
              <button
                type="button"
                (click)="onApply()"
                [disabled]="!selectedStatus || selectedStatus === currentStatus"
                class="w-full bg-white text-[#0098A8] hover:bg-white/90 font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Aplicar Cambios
              </button>
              <button
                type="button"
                (click)="onClose()"
                class="w-full bg-white text-[#0098A8] hover:bg-white/90 font-semibold py-3 rounded-lg border-none transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class EstadoDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() currentStatus: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<string>();

  selectedStatus: string = '';

  statuses = [
    { value: 'programada', label: 'Programada' },
    { value: 'en_curso', label: 'En Curso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'urgencia', label: 'Urgencia' },
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && this.currentStatus) {
      this.selectedStatus = this.currentStatus;
    }
  }

  selectStatus(status: string) {
    this.selectedStatus = status;
  }

  onApply() {
    if (this.selectedStatus && this.selectedStatus !== this.currentStatus) {
      this.statusChange.emit(this.selectedStatus);
    }
    this.onClose();
  }

  onClose() {
    this.close.emit();
  }
}
