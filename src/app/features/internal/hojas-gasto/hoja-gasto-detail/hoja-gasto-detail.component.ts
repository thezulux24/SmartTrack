import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HojaGastoService } from '../data-access/hoja-gasto.service';
import { HojaGasto, EstadoHojaGasto, CategoriaProducto, ESTADOS_CONFIG, CATEGORIAS_CONFIG } from '../data-access/hoja-gasto.model';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

@Component({
  selector: 'app-hoja-gasto-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hoja-gasto-detail.component.html',
  styleUrl: './hoja-gasto-detail.component.css'
})
export class HojaGastoDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private hojaGastoService = inject(HojaGastoService);
  private supabaseService = inject(SupabaseService);

  // Signals para el estado del componente
  loading = signal(false);
  error = signal<string | null>(null);
  hojaGasto = signal<HojaGasto | null>(null);
  currentUserRole = signal<string | null>(null);
  currentUserId = signal<string | null>(null);

  // Parámetro de entrada
  hojaId = input<string | null>(null);

  // Computadas
  totalItems = computed(() => {
    const items = this.hojaGasto()?.items || this.hojaGasto()?.hoja_gasto_items || [];
    return items.length;
  });
  
  clienteNombre = computed(() => {
    const hoja = this.hojaGasto();
    if (hoja?.cirugia?.cliente) {
      return `${hoja.cirugia.cliente.nombre} ${hoja.cirugia.cliente.apellido}`;
    }
    return 'N/A';
  });
  
  tecnicoNombre = computed(() => {
    const hoja = this.hojaGasto();
    if (hoja?.tecnico?.full_name) {
      return hoja.tecnico.full_name;
    }
    return 'N/A';
  });

  // Configuraciones para templates
  readonly ESTADOS_CONFIG = ESTADOS_CONFIG;
  readonly CATEGORIAS_CONFIG = CATEGORIAS_CONFIG;

  async ngOnInit() {
    await this.loadCurrentUser();
    this.loadHojaGasto();
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

  async loadHojaGasto() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID de hoja de gasto no válido');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      this.hojaGastoService.getHojaGasto(id).subscribe({
        next: (hoja) => {
          if (hoja) {
            this.hojaGasto.set(hoja);
          } else {
            this.error.set('Hoja de gasto no encontrada');
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error cargando hoja de gasto:', error);
          this.error.set('Error al cargar la hoja de gasto. Por favor, inténtelo de nuevo.');
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error in loadHojaGasto:', error);
      this.error.set('Error inesperado al cargar la hoja de gasto.');
      this.loading.set(false);
    }
  }

  async cambiarEstado(nuevoEstado: EstadoHojaGasto) {
    const hoja = this.hojaGasto();
    if (!hoja) return;

    try {
      this.hojaGastoService.cambiarEstado(hoja.id, nuevoEstado).subscribe({
        next: (hojaActualizada) => {
          this.hojaGasto.set(hojaActualizada);
          // Opcional: mostrar mensaje de éxito
        },
        error: (error) => {
          console.error('Error cambiando estado:', error);
          this.error.set('Error al cambiar el estado. Por favor, inténtelo de nuevo.');
        }
      });
    } catch (error) {
      console.error('Error in cambiarEstado:', error);
      this.error.set('Error inesperado al cambiar el estado.');
    }
  }

  editarHoja() {
    const hoja = this.hojaGasto();
    if (hoja) {
      this.router.navigate(['/internal/hojas-gasto/edit', hoja.id]);
    }
  }

  volver() {
    this.router.navigate(['/internal/hojas-gasto']);
  }

  // Métodos de utilidad para templates
  getEstadoInfo(estado: EstadoHojaGasto) {
    return ESTADOS_CONFIG[estado] || { label: estado, color: 'bg-gray-100 text-gray-800' };
  }

  getCategoriaInfo(categoria: CategoriaProducto) {
    return CATEGORIAS_CONFIG[categoria] || { label: categoria, color: 'text-gray-600' };
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
      month: 'long',
      day: 'numeric'
    });
  }

  formatFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getItemsByCategory(categoria: CategoriaProducto) {
    const items = this.hojaGasto()?.items || this.hojaGasto()?.hoja_gasto_items || [];
    return items.filter(item => item.categoria === categoria);
  }

  getTotalByCategory(categoria: CategoriaProducto): number {
    return this.getItemsByCategory(categoria).reduce((total, item) => {
      const precio = item.subtotal || item.precio_total || 0;
      return total + precio;
    }, 0);
  }

  canEdit(): boolean {
    const hoja = this.hojaGasto();
    const role = this.currentUserRole();
    const userId = this.currentUserId();
    
    if (!hoja || !role) return false;
    
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

  canApprove(): boolean {
    const hoja = this.hojaGasto();
    const role = this.currentUserRole();
    
    if (!hoja || !role) return false;
    
    // Solo logística y admin pueden aprobar
    if (role !== 'logistica' && role !== 'admin') return false;
    
    // Solo se puede aprobar si está en borrador o revisión
    return hoja.estado === 'borrador' || hoja.estado === 'revision';
  }

  canValidate(): boolean {
    const hoja = this.hojaGasto();
    const role = this.currentUserRole();
    
    if (!hoja || !role) return false;
    
    // Solo logística y admin pueden validar
    return (role === 'logistica' || role === 'admin') && hoja.estado === 'aprobada';
  }
}