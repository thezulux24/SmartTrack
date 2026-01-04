import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CotizacionService } from '../../../../shared/services/cotizacion.service';
import { 
  Cotizacion, 
  CotizacionEstado,
  COTIZACION_ESTADO_LABELS,
  COTIZACION_ESTADO_COLORS 
} from '../../../../shared/models/cotizacion.model';

@Component({
  selector: 'app-cotizaciones-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cotizaciones-list.component.html',
  styleUrl: './cotizaciones-list.component.css'
})
export class CotizacionesListComponent implements OnInit {
  private cotizacionService = inject(CotizacionService);
  router = inject(Router);

  cotizaciones = signal<Cotizacion[]>([]);
  loading = signal(true);
  
  // Valores normales para ngModel
  filtroEstado: CotizacionEstado | 'todos' = 'todos';
  busqueda: string = '';

  // Computed para filtrar cotizaciones
  cotizacionesFiltradas = computed(() => {
    let lista = this.cotizaciones();

    // Filtrar por estado
    if (this.filtroEstado !== 'todos') {
      lista = lista.filter(c => c.estado === this.filtroEstado);
    }

    // Filtrar por búsqueda
    const search = this.busqueda.toLowerCase();
    if (search) {
      lista = lista.filter(c => 
        c.numero_cotizacion.toLowerCase().includes(search) ||
        c.cliente?.nombre.toLowerCase().includes(search) ||
        c.cliente?.apellido.toLowerCase().includes(search)
      );
    }

    return lista;
  });

  // Estados para filtros
  estadosDisponibles: Array<{value: CotizacionEstado | 'todos', label: string}> = [
    { value: 'todos', label: 'Todas' },
    { value: 'borrador', label: 'Borradores' },
    { value: 'enviada', label: 'Enviadas' },
    { value: 'aprobada', label: 'Aprobadas' },
    { value: 'rechazada', label: 'Rechazadas' },
    { value: 'vencida', label: 'Vencidas' },
    { value: 'cancelada', label: 'Canceladas' }
  ];

  // Stats computadas
  stats = computed(() => {
    const lista = this.cotizaciones();
    return {
      total: lista.length,
      borradores: lista.filter(c => c.estado === 'borrador').length,
      enviadas: lista.filter(c => c.estado === 'enviada').length,
      aprobadas: lista.filter(c => c.estado === 'aprobada').length,
      rechazadas: lista.filter(c => c.estado === 'rechazada').length,
      vencidas: lista.filter(c => c.estado === 'vencida').length
    };
  });

  ngOnInit() {
    this.cargarCotizaciones();
  }

  cargarCotizaciones() {
    this.loading.set(true);
    this.cotizacionService.getCotizaciones().subscribe({
      next: (data) => {
        this.cotizaciones.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando cotizaciones:', error);
        this.loading.set(false);
      }
    });
  }

  verDetalle(id: string) {
    this.router.navigate(['/internal/cotizaciones', id]);
  }

  crearNueva() {
    this.router.navigate(['/internal/cotizaciones/nueva']);
  }

  editar(id: string) {
    this.router.navigate(['/internal/cotizaciones/editar', id]);
  }

  async eliminar(id: string) {
    const cotizacion = this.cotizaciones().find(c => c.id === id);
    if (!cotizacion) return;
    
    if (cotizacion.estado !== 'borrador') {
      alert('Solo se pueden eliminar cotizaciones en borrador');
      return;
    }

    if (!confirm(`¿Eliminar cotización ${cotizacion.numero_cotizacion}?`)) {
      return;
    }

    const resultado = await this.cotizacionService.deleteCotizacion(cotizacion.id);
    if (resultado.exito) {
      alert('Cotización eliminada exitosamente');
      this.cargarCotizaciones();
    } else {
      alert(resultado.mensaje || 'Error al eliminar');
    }
  }

  getEstadoLabel(estado: CotizacionEstado): string {
    return COTIZACION_ESTADO_LABELS[estado];
  }

  getEstadoColor(estado: CotizacionEstado): string {
    return COTIZACION_ESTADO_COLORS[estado];
  }

  getEstadoBadgeClass(estado: CotizacionEstado): string {
    const colors: Record<CotizacionEstado, string> = {
      borrador: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      enviada: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      aprobada: 'bg-green-500/20 text-green-300 border-green-500/30',
      rechazada: 'bg-red-500/20 text-red-300 border-red-500/30',
      vencida: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      cancelada: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[estado];
  }

  formatMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  diasHastaVencimiento(fechaVencimiento: string): number {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  esProximaAVencer(cotizacion: Cotizacion): boolean {
    if (cotizacion.estado !== 'enviada') return false;
    const dias = this.diasHastaVencimiento(cotizacion.fecha_vencimiento);
    return dias >= 0 && dias <= 3;
  }

  getClienteNombre(cotizacion: Cotizacion): string {
    if (!cotizacion.cliente) return 'N/A';
    return `${cotizacion.cliente.nombre} ${cotizacion.cliente.apellido}`;
  }
}
