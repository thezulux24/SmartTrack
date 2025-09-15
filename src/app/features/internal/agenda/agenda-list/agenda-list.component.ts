import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // ✅ AGREGAR ESTA LÍNEA
import { CirugiasService } from '../data-access/cirugias.service';
import { Cirugia } from '../data-access/models';

@Component({
  selector: 'app-agenda-list',
  standalone: true,
  imports: [CommonModule, RouterModule], // ✅ AGREGAR RouterModule AQUÍ
  templateUrl: './agenda-list.component.html',
  styleUrl: './agenda-list.component.css'
})
export class AgendaListComponent implements OnInit {
  
  // Signals para el estado del componente
  loading = signal(false);
  error = signal<string | null>(null);
  cirugias = signal<Cirugia[]>([]);
  
  // Signals para filtros
  searchTerm = signal('');
  selectedEstado = signal('');
  selectedFecha = signal('');
  
  // Computed para cirugías filtradas
  filteredCirugias = computed(() => {
    let result = this.cirugias();
    
    // Filtro por búsqueda
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(cirugia => 
        cirugia.paciente_nombre.toLowerCase().includes(term) ||
        cirugia.hospital.toLowerCase().includes(term) ||
        cirugia.medico_cirujano.toLowerCase().includes(term) ||
        cirugia.numero_cirugia.toLowerCase().includes(term)
      );
    }
    
    // Filtro por estado
    if (this.selectedEstado()) {
      result = result.filter(cirugia => cirugia.estado === this.selectedEstado());
    }
    
    // Filtro por fecha
    if (this.selectedFecha()) {
      const fechaSeleccionada = this.selectedFecha();
      result = result.filter(cirugia => {
        const fechaCirugia = new Date(cirugia.fecha_programada).toISOString().split('T')[0];
        return fechaCirugia === fechaSeleccionada;
      });
    }
    
    return result;
  });

  constructor(private cirugiasService: CirugiasService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);
    
    this.cirugiasService.getCirugias().subscribe({
      next: (cirugias) => {
        this.cirugias.set(cirugias);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar las cirugías. Por favor intenta nuevamente.');
        this.loading.set(false);
        console.error('Error loading cirugias:', err);
      }
    });
  }

  // Métodos para manejar cambios en filtros
  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  onEstadoChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedEstado.set(target.value);
  }

  onFechaChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.selectedFecha.set(target.value);
  }

  // Métodos para formateo y estilos
  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const baseClass = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (estado) {
      case 'programada':
        return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'en_curso':
        return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'completada':
        return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'cancelada':
        return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case 'urgencia':
        return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'programada': return 'Programada';
      case 'en_curso': return 'En Curso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      case 'urgencia': return 'Urgencia';
      default: return estado;
    }
  }

  getPrioridadBadgeClass(prioridad: string): string {
    const baseClass = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (prioridad) {
      case 'alta':
        return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case 'urgencia':
        return `${baseClass} bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-200`;
      case 'normal':
        return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'baja':
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  }

  getPrioridadLabel(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'Alta';
      case 'urgencia': return 'Urgencia';
      case 'normal': return 'Normal';
      case 'baja': return 'Baja';
      default: return prioridad;
    }
  }

  cambiarEstado(cirugia: Cirugia) {
    // TODO: Implementar modal o componente para cambiar estado
    console.log('Cambiar estado de:', cirugia.numero_cirugia);
    
    // Por ahora, ejemplo simple:
    let nuevoEstado = '';
    switch (cirugia.estado) {
      case 'programada':
        nuevoEstado = 'en_curso';
        break;
      case 'en_curso':
        nuevoEstado = 'completada';
        break;
      default:
        return;
    }
    
    this.cirugiasService.updateEstado(cirugia.id, nuevoEstado, 'Estado actualizado desde la lista').subscribe({
      next: () => {
        this.loadData(); // Recargar datos
      },
      error: (err) => {
        console.error('Error updating estado:', err);
        // TODO: Mostrar toast de error
      }
    });
  }


  // Computed para KPIs
cirugiasProgramadas = computed(() => 
  this.cirugias().filter(c => c.estado === 'programada').length
);

cirugiasCurso = computed(() => 
  this.cirugias().filter(c => c.estado === 'en_curso').length
);

cirugiasFcompletadas = computed(() => 
  this.cirugias().filter(c => c.estado === 'completada').length
);

cirugiaUrgencia = computed(() => 
  this.cirugias().filter(c => c.estado === 'urgencia' || c.prioridad === 'urgencia').length
);
}