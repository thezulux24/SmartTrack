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
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

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
  private supabaseService = inject(SupabaseService);

  // Signals para el estado del componente
  loading = signal(false);
  error = signal<string | null>(null);
  hojasGasto = signal<HojaGasto[]>([]);
  currentUserRole = signal<string | null>(null);
  currentUserId = signal<string | null>(null);
  
  // Filtros
  filtroEstado = signal<EstadoHojaGasto | ''>('');
  
  // Configuraciones para templates
  readonly ESTADOS_CONFIG = ESTADOS_CONFIG;

  async ngOnInit() {
    await this.loadCurrentUser();
    this.loadHojasGasto();
  }

  async loadCurrentUser() {
    try {
      const session = await this.supabaseService.getSession();
      if (session?.user?.id) {
        this.currentUserId.set(session.user.id);
        
        // Obtener el rol del usuario
        const { data: profile } = await this.supabaseService.client
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          this.currentUserRole.set(profile.role);
        }
      }
    } catch (error) {
      console.error('Error cargando usuario actual:', error);
    }
  }

  loadHojasGasto() {
    this.loading.set(true);
    this.error.set(null);
    
    const filters: HojaGastoFilters = {};
    
    // Si es técnico, solo ver sus propias hojas de gasto
    if (this.currentUserRole() === 'soporte_tecnico' && this.currentUserId()) {
      filters.tecnico_id = this.currentUserId()!;
      console.log('🔍 Filtrando hojas de gasto para técnico:', this.currentUserId());
    }
    
    if (this.filtroEstado()) {
      filters.estado = this.filtroEstado() as EstadoHojaGasto;
    }
    
    this.hojaGastoService.getHojasGasto(filters).subscribe({
      next: (hojas) => {
        this.hojasGasto.set(hojas);
        this.loading.set(false);
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

  canEditHoja(hoja: HojaGasto): boolean {
    const role = this.currentUserRole();
    const userId = this.currentUserId();
    
    if (!role) return false;
    
    // Solo puede editar si el estado lo permite
    const estadoPermiteEdicion = hoja.estado === 'borrador' || hoja.estado === 'revision';
    if (!estadoPermiteEdicion) return false;
    
    // El técnico solo puede editar sus propias hojas de gasto
    if (role === 'soporte_tecnico') {
      return hoja.tecnico_id === userId;
    }
    
    // Logística y admin pueden editar cualquier hoja
    return role === 'logistica' || role === 'admin';
  }
}