import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cotizacion-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[#10284C] to-[#0a1829] p-8">
      <div class="max-w-5xl mx-auto">
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
          <h1 class="text-3xl font-bold text-white mb-4">📋 Detalle de Cotización</h1>
          <p class="text-white/60">Componente en desarrollo. Incluirá:</p>
          <ul class="text-white/80 mt-4 space-y-2 list-disc list-inside">
            <li>Vista completa de la cotización</li>
            <li>Timeline de cambios de estado</li>
            <li>Botón "Descargar PDF"</li>
            <li>Botón "Enviar al Cliente"</li>
            <li>Cambiar estado (Aprobar/Rechazar)</li>
            <li>Convertir a Cirugía (si está aprobada)</li>
            <li>Historial de acciones</li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class CotizacionDetailComponent {}
