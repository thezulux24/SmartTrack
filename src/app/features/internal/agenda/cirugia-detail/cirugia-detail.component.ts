import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs/operators';

import { CirugiasService } from '../data-access/cirugias.service';
import { Cirugia } from '../data-access/models';
import { EstadoDialogComponent } from './estado-dialog.component';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';
import { SuccessDialogComponent } from '../components/success-dialog.component';

@Component({
  selector: 'app-cirugia-detail',
  standalone: true,
  imports: [CommonModule, EstadoDialogComponent, ConfirmDialogComponent, SuccessDialogComponent],
  templateUrl: './cirugia-detail.component.html',
  styleUrl: './cirugia-detail.component.css'
})
export class CirugiaDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cirugiasService = inject(CirugiasService);

  // Signals
  loading = signal(false);
  error = signal<string | null>(null);
  cirugia = signal<Cirugia | null>(null);
  showEstadoDialog = signal(false);
  showConfirmDeleteDialog = signal(false);
  showSuccessDeleteDialog = signal(false);
  
  // Estados y prioridades para mostrar
  estadosInfo = {
    'programada': { label: 'Programada', color: 'bg-blue-100 text-blue-800', icon: '📅' },
    'en_curso': { label: 'En Curso', color: 'bg-yellow-100 text-yellow-800', icon: '⚡' },
    'completada': { label: 'Completada', color: 'bg-green-100 text-green-800', icon: '✅' },
    'cancelada': { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: '❌' },
    'urgencia': { label: 'Urgencia', color: 'bg-orange-100 text-orange-800', icon: '🚨' }
  };

  prioridadesInfo = {
    'baja': { label: 'Baja', color: 'bg-gray-100 text-gray-800' },
    'normal': { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    'alta': { label: 'Alta', color: 'bg-yellow-100 text-yellow-800' },
    'urgencia': { label: 'Urgencia', color: 'bg-red-100 text-red-800' }
  };

  ngOnInit() {
    this.loadCirugia();
  }

  private loadCirugia() {
    this.loading.set(true);
    this.error.set(null);

    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          throw new Error('ID de cirugía no encontrado');
        }
        return this.cirugiasService.getCirugiaById(id);
      })
    ).subscribe({
      next: (cirugia) => {
        this.cirugia.set(cirugia);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar la cirugía: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  // ✅ Métodos de utilidad corregidos
  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatHora(hora: string | undefined | null): string {
    return hora || 'No especificada';
  }

  formatDuracion(minutos: number | undefined | null): string {
    if (!minutos) return 'No especificada';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  getEstadoInfo(estado: string) {
    return this.estadosInfo[estado as keyof typeof this.estadosInfo] || 
           { label: estado, color: 'bg-gray-100 text-gray-800', icon: '❓' };
  }

  getPrioridadInfo(prioridad: string) {
    return this.prioridadesInfo[prioridad as keyof typeof this.prioridadesInfo] || 
           { label: prioridad, color: 'bg-gray-100 text-gray-800' };
  }

  // Acciones
  editarCirugia() {
    const cirugia = this.cirugia();
    if (cirugia) {
      this.router.navigate(['/internal/agenda/editar', cirugia.id]);
    }
  }

  cambiarEstado() {
    const cirugia = this.cirugia();
    if (!cirugia) return;

    // Si ya está completada o cancelada, no permitir cambios
    if (cirugia.estado === 'completada' || cirugia.estado === 'cancelada') {
      alert('No se puede cambiar el estado de una cirugía completada o cancelada');
      return;
    }

    // Abrir el diálogo de cambio de estado
    this.showEstadoDialog.set(true);
  }

  onEstadoChange(nuevoEstado: string) {
    const cirugia = this.cirugia();
    if (!cirugia) return;

    const estadoValido = nuevoEstado as 'programada' | 'en_curso' | 'completada' | 'cancelada' | 'urgencia';

    this.loading.set(true);
    this.cirugiasService.updateCirugia(cirugia.id, { estado: estadoValido }).subscribe({
      next: (cirugiaActualizada) => {
        console.log('✅ Estado actualizado:', cirugiaActualizada);
        this.cirugia.set(cirugiaActualizada);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error updating estado:', err);
        this.error.set('Error al cambiar estado: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  closeEstadoDialog() {
    this.showEstadoDialog.set(false);
  }

  volverAtras() {
    this.router.navigate(['/internal/agenda']);
  }

  recargarDatos() {
    this.loadCirugia();
  }

  // Método para compartir (futuro)
  compartirCirugia() {
    const cirugia = this.cirugia();
    if (!cirugia) return;

    if (navigator.share) {
      navigator.share({
        title: `Cirugía ${cirugia.numero_cirugia}`,
        text: `${this.getClienteNombre()} - ${cirugia.tipo_cirugia_data?.nombre}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Enlace copiado al portapapeles');
      }).catch(() => {
        alert('No se pudo copiar el enlace');
      });
    }
  }

  // Método para imprimir (futuro)
  imprimirDetalle() {
    window.print();
  }

  // Métodos de eliminación
  confirmarEliminar() {
    this.showConfirmDeleteDialog.set(true);
  }

  onConfirmDelete() {
    const cirugia = this.cirugia();
    if (!cirugia) return;

    console.log('🗑️ Eliminando cirugía:', cirugia.numero_cirugia);
    this.loading.set(true);
    this.showConfirmDeleteDialog.set(false);

    this.cirugiasService.deleteCirugia(cirugia.id).subscribe({
      next: () => {
        console.log('✅ Cirugía eliminada exitosamente');
        this.loading.set(false);
        this.showSuccessDeleteDialog.set(true);
      },
      error: (err) => {
        console.error('❌ Error eliminando cirugía:', err);
        this.error.set('Error al eliminar la cirugía: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  onCancelDelete() {
    this.showConfirmDeleteDialog.set(false);
  }

  onSuccessDeleteClose() {
    this.showSuccessDeleteDialog.set(false);
    this.router.navigate(['/internal/agenda']);
  }

  // Métodos helper para obtener información del cliente
  getClienteNombre(): string {
    const cirugia = this.cirugia();
    if (!cirugia?.cliente) return 'Sin información';
    
    return `${cirugia.cliente.nombre} ${cirugia.cliente.apellido}`.trim();
  }

  getClienteDocumento(): string | null {
    const cirugia = this.cirugia();
    if (!cirugia?.cliente) return null;
    
    return `${cirugia.cliente.documento_tipo}: ${cirugia.cliente.documento_numero}`;
  }

  getClienteTelefono(): string | null {
    const cirugia = this.cirugia();
    if (!cirugia?.cliente) return null;
    
    return cirugia.cliente.telefono || null;
  }

  getClienteEmail(): string | null {
    const cirugia = this.cirugia();
    if (!cirugia) return null;
    
    return cirugia.cliente?.email || null;
  }

  getClienteCiudad(): string | null {
    const cirugia = this.cirugia();
    if (!cirugia) return null;
    
    return cirugia.cliente?.ciudad || null;
  }

  getNumeroCirugia(): string {
    return this.cirugia()?.numero_cirugia || '';
  }
}