import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HojaGastoService } from '../data-access/hoja-gasto.service';
import { 
  HojaGasto, 
  HojaGastoFilters, 
  EstadoHojaGasto,
  ESTADOS_CONFIG
} from '../data-access/hoja-gasto.model';

@Component({
  selector: 'app-hoja-gasto-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hoja-gasto-list.component.html',
  styleUrl: './hoja-gasto-list.component.css'
})
export class HojaGastoListComponent implements OnInit {
  private router = inject(Router);
  private hojaGastoService = inject(HojaGastoService);

  // Signals para el estado del componente
  loading = signal(false);
  error = signal<string | null>(null);
  hojasGasto = signal<HojaGasto[]>([]);
  
  // Filtros
  filtroEstado = signal<EstadoHojaGasto | ''>('');
  
  // Configuraciones para templates
  readonly ESTADOS_CONFIG = ESTADOS_CONFIG;

  ngOnInit() {
    console.log('📋 HojaGastoListComponent iniciando...');
    this.loadHojasGasto();
  }

  loadHojasGasto() {
    this.loading.set(true);
    this.error.set(null);
    
    const filters: HojaGastoFilters = {};
    
    if (this.filtroEstado()) {
      filters.estado = this.filtroEstado() as EstadoHojaGasto;
    }
    
    this.hojaGastoService.getHojasGasto(filters).subscribe({
      next: (hojas) => {
        this.hojasGasto.set(hojas);
        this.loading.set(false);
        console.log('✅ Hojas de gasto cargadas:', hojas.length);
      },
      error: (error: any) => {
        console.error('❌ Error cargando hojas de gasto:', error);
        this.error.set('Error al cargar las hojas de gasto. Por favor, inténtelo de nuevo.');
        this.loading.set(false);
      }
    });
  }

  onFiltroEstadoChange(estado: string) {
    this.filtroEstado.set(estado as EstadoHojaGasto);
    this.loadHojasGasto();
  }

  clearFiltros() {
    this.filtroEstado.set('');
    this.loadHojasGasto();
  }

  nuevaHoja() {
    this.router.navigate(['/internal/hojas-gasto/new']);
  }

  verDetalle(hojaId: string) {
    this.router.navigate(['/internal/hojas-gasto/detail', hojaId]);
  }

  editarHoja(hojaId: string) {
    this.router.navigate(['/internal/hojas-gasto/edit', hojaId]);
  }

  volver() {
    this.router.navigate(['/internal']);
  }

  // Métodos de utilidad para templates
  getEstadoInfo(estado: EstadoHojaGasto) {
    return ESTADOS_CONFIG[estado] || { label: estado, color: 'bg-gray-100 text-gray-800' };
  }

  getClienteNombre(hoja: HojaGasto): string {
    if (hoja.cirugia?.cliente) {
      return `${hoja.cirugia.cliente.nombre} ${hoja.cirugia.cliente.apellido}`;
    }
    return 'N/A';
  }

  getTecnicoNombre(hoja: HojaGasto): string {
    if (hoja.tecnico?.full_name) {
      return hoja.tecnico.full_name;
    }
    return 'N/A';
  }

  formatMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(valor);
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  cambiarEstado(hojaId: string, nuevoEstado: EstadoHojaGasto, event: Event) {
    event.stopPropagation();
    
    this.hojaGastoService.cambiarEstado(hojaId, nuevoEstado).subscribe({
      next: (hojaActualizada) => {
        // Actualizar la hoja en la lista
        const hojas = this.hojasGasto();
        const index = hojas.findIndex(h => h.id === hojaId);
        if (index !== -1) {
          hojas[index] = hojaActualizada;
          this.hojasGasto.set([...hojas]);
        }
      },
      error: (error: any) => {
        console.error('Error cambiando estado:', error);
        this.error.set('Error al cambiar el estado. Por favor, inténtelo de nuevo.');
      }
    });
  }
}