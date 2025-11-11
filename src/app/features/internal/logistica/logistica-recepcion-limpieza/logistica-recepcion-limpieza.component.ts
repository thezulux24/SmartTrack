import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LimpiezaService } from '../data-access/limpieza.service';
import { KitLimpiezaAgrupado, KitProductoLimpieza } from '../data-access/limpieza.model';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

@Component({
  selector: 'app-logistica-recepcion-limpieza',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistica-recepcion-limpieza.component.html',
  styleUrl: './logistica-recepcion-limpieza.component.css'
})
export class LogisticaRecepcionLimpiezaComponent implements OnInit {
  private router = inject(Router);
  private limpiezaService = inject(LimpiezaService);
  private supabaseService = inject(SupabaseService);

  // Signals para el estado
  loading = signal(false);
  error = signal<string | null>(null);
  kitsEnLimpieza = signal<KitLimpiezaAgrupado[]>([]);
  kitSeleccionado = signal<KitLimpiezaAgrupado | null>(null);
  productosSeleccionados = signal<Set<string>>(new Set());
  observaciones = signal('');
  showConfirmDialog = signal(false);
  procesando = signal(false);

  // Computed
  totalKits = computed(() => this.kitsEnLimpieza().length);
  totalProductos = computed(() => 
    this.kitsEnLimpieza().reduce((sum, kit) => sum + kit.productos_pendientes, 0)
  );
  haySeleccion = computed(() => this.productosSeleccionados().size > 0);
  todosSeleccionados = computed(() => {
    const kit = this.kitSeleccionado();
    if (!kit) return false;
    return kit.productos.every(p => this.productosSeleccionados().has(p.id));
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);

    this.limpiezaService.getKitsEnLimpieza().subscribe({
      next: (kits) => {
        this.kitsEnLimpieza.set(kits);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error cargando kits:', err);
        this.error.set('Error al cargar los kits en limpieza. Por favor, intenta de nuevo.');
        this.loading.set(false);
      }
    });
  }

  verDetalleKit(kit: KitLimpiezaAgrupado) {
    this.kitSeleccionado.set(kit);
    // Seleccionar todos los productos por defecto
    const nuevaSeleccion = new Set<string>(kit.productos.map(p => p.id));
    this.productosSeleccionados.set(nuevaSeleccion);
  }

  cerrarDetalle() {
    this.kitSeleccionado.set(null);
    this.productosSeleccionados.set(new Set());
    this.observaciones.set('');
  }

  toggleProducto(productoId: string) {
    const seleccion = new Set(this.productosSeleccionados());
    if (seleccion.has(productoId)) {
      seleccion.delete(productoId);
    } else {
      seleccion.add(productoId);
    }
    this.productosSeleccionados.set(seleccion);
  }

  toggleTodos() {
    const kit = this.kitSeleccionado();
    if (!kit) return;

    if (this.todosSeleccionados()) {
      // Deseleccionar todos
      this.productosSeleccionados.set(new Set());
    } else {
      // Seleccionar todos
      const nuevaSeleccion = new Set<string>(kit.productos.map(p => p.id));
      this.productosSeleccionados.set(nuevaSeleccion);
    }
  }

  abrirConfirmacion() {
    if (!this.haySeleccion()) {
      alert('Debes seleccionar al menos un producto');
      return;
    }
    this.showConfirmDialog.set(true);
  }

  cerrarConfirmacion() {
    this.showConfirmDialog.set(false);
  }

  async confirmarRecepcion() {
    const kit = this.kitSeleccionado();
    if (!kit) return;

    // Obtener el usuario actual desde Supabase Auth
    const { data: { user }, error: authError } = await this.supabaseService.supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Error obteniendo usuario:', authError);
      alert('No se pudo identificar el usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    const userId = user.id;

    this.procesando.set(true);

    const request = {
      kit_id: kit.kit_id,
      productos_ids: Array.from(this.productosSeleccionados()),
      observaciones: this.observaciones() || undefined,
      recibido_por_id: userId
    };

    this.limpiezaService.confirmarRecepcion(request).subscribe({
      next: (success) => {
        this.procesando.set(false);
        if (success) {
          this.showConfirmDialog.set(false);
          this.cerrarDetalle();
          this.loadData(); // Recargar lista
          this.mostrarMensajeExito();
        } else {
          this.error.set('Error al confirmar la recepción');
        }
      },
      error: (err) => {
        console.error('❌ Error en confirmación:', err);
        this.procesando.set(false);
        this.error.set('Error al confirmar la recepción. Por favor, intenta de nuevo.');
      }
    });
  }

  mostrarMensajeExito() {
    // Podemos usar un dialog o simplemente un alert
    alert('✅ Recepción confirmada exitosamente. Los productos han sido devueltos al inventario.');
  }

  formatFecha(fecha: string | undefined): string {
    if (!fecha) return 'No registrada';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDiasEnLimpieza(fechaInicio: string | undefined): number {
    if (!fechaInicio) return 0;
    const inicio = new Date(fechaInicio);
    const ahora = new Date();
    const diff = ahora.getTime() - inicio.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getProductosSeleccionadosDelKit(): KitProductoLimpieza[] {
    const kit = this.kitSeleccionado();
    if (!kit) return [];
    return kit.productos.filter(p => this.productosSeleccionados().has(p.id));
  }

  getTotalCantidadSeleccionada(): number {
    return this.getProductosSeleccionadosDelKit()
      .reduce((sum, p) => sum + (p.cantidad_aprobada || p.cantidad_a_recuperar), 0);
  }

  volver() {
    this.router.navigate(['/internal/logistica']);
  }
}
