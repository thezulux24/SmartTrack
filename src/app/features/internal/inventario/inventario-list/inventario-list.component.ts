import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService, Producto, Inventario, MovimientoInventario } from '../../../../shared/data-access/supabase.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'app-inventario-list',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inventario-list.component.html',
  styleUrl: './inventario-list.component.css'
})
export default class InventarioListComponent implements OnInit {

  private _supabaseService = inject(SupabaseService);
  private _notificationService = inject(NotificationService);

  // Signals para el estado
  loading = signal(false);
  productos = signal<any[]>([]);
  inventarios = signal<Inventario[]>([]);
  filteredProductos = signal<any[]>([]);
  error = signal<string | null>(null);

  // Estado del modal
  showModal = signal(false);
  modalType = signal<'entrada' | 'salida'>('entrada');
  selectedProducto = signal<any | null>(null);
  selectedInventario = signal<Inventario | null>(null);

  // Filtros
  searchTerm = signal('');
  selectedCategory = signal('');
  selectedUbicacion = signal('');

  // Formulario del modal
  cantidad = 0;
  motivo = '';
  ubicacion = 'sede_principal';

  categorias = [
    'osteosintesis',
    'columna', 
    'trauma',
    'fijacion_externa'
  ];

  // ✅ Ubicaciones simplificadas
  ubicaciones = [
    'sede_principal',
    'bodega',
    'sede_secundaria'
  ];

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [productosData, inventariosData] = await Promise.all([
        this._supabaseService.getProductosConStock(),
        this._supabaseService.getInventarios()
      ]);

      // Procesar productos con su stock total
      const productosConStock = productosData.map(producto => {
        const stockTotal = producto.inventario
          ?.filter((inv: any) => inv.estado === 'disponible')
          ?.reduce((total: number, inv: any) => total + inv.cantidad, 0) || 0;

        return {
          ...producto,
          stock_total: stockTotal,
          stock_bajo: stockTotal <= producto.stock_minimo
        };
      });

      this.productos.set(productosConStock);
      this.inventarios.set(inventariosData);
      this.applyFilters();

    } catch (err: any) {
      console.error('Error cargando inventario:', err);
      this.error.set(err?.message || 'Error al cargar inventario');
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    let filtered = this.productos();

    // Filtro por búsqueda
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.codigo.toLowerCase().includes(term)
      );
    }

    // Filtro por categoría
    if (this.selectedCategory()) {
      filtered = filtered.filter(p => p.categoria === this.selectedCategory());
    }

    this.filteredProductos.set(filtered);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.applyFilters();
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(value);
    this.applyFilters();
  }

  openModal(type: 'entrada' | 'salida', producto: any): void {
    this.modalType.set(type);
    this.selectedProducto.set(producto);
    
    // Para salidas, buscar inventario disponible
    if (type === 'salida') {
      const inventarioDisponible = this.inventarios().find(inv => 
        inv.producto_id === producto.id && 
        inv.estado === 'disponible' && 
        inv.cantidad > 0
      );
      this.selectedInventario.set(inventarioDisponible || null);
    }

    this.showModal.set(true);
    this.resetForm();
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  resetForm(): void {
    this.cantidad = 0;
    this.motivo = '';
    this.ubicacion = 'sede_principal';
  }

  async submitMovimiento(): Promise<void> {
    if (!this.selectedProducto() || this.cantidad <= 0) return;

    this.loading.set(true);

    try {
      const session = await this._supabaseService.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const producto = this.selectedProducto()!;
      let inventarioId: string;

      if (this.modalType() === 'entrada') {
        // Crear nuevo registro de inventario o usar existente
        const inventarioExistente = this.inventarios().find(inv => 
          inv.producto_id === producto.id && 
          inv.ubicacion === this.ubicacion &&
          inv.estado === 'disponible'
        );

        if (inventarioExistente) {
          inventarioId = inventarioExistente.id;
          await this._supabaseService.updateInventario(
            inventarioId, 
            inventarioExistente.cantidad + this.cantidad
          );
        } else {
          // Crear nuevo inventario
          const { data: nuevoInventario, error } = await this._supabaseService.client
            .from('inventario')
            .insert({
              producto_id: producto.id,
              cantidad: this.cantidad,
              ubicacion: this.ubicacion,
              estado: 'disponible'
            })
            .select()
            .single();

          if (error) throw error;
          inventarioId = nuevoInventario.id;
        }
      } else {
        // Salida
        const inventario = this.selectedInventario();
        if (!inventario || inventario.cantidad < this.cantidad) {
          throw new Error('Stock insuficiente');
        }

        inventarioId = inventario.id;
        const nuevaCantidad = inventario.cantidad - this.cantidad;
        
        await this._supabaseService.updateInventario(
          inventarioId,
          nuevaCantidad
        );

        // 📢 Notificar si el stock queda crítico después del movimiento
        if (nuevaCantidad <= (producto.stock_minimo || 0)) {
          console.log('⚠️ Stock crítico detectado después de salida:', {
            producto: producto.nombre,
            nuevaCantidad,
            stock_minimo: producto.stock_minimo
          });
          
          const logisticaIds = await this.getLogisticaUsers();
          if (logisticaIds.length > 0) {
            await this._notificationService.notifyLowStock(
              logisticaIds,
              producto.id,
              producto.nombre,
              nuevaCantidad,
              producto.stock_minimo || 0
            );
          }
        }
      }

      // Registrar movimiento
      await this._supabaseService.createMovimiento({
        inventario_id: inventarioId,
        producto_id: producto.id,
        tipo: this.modalType(),
        cantidad: this.modalType() === 'entrada' ? this.cantidad : -this.cantidad,
        motivo: this.motivo || `${this.modalType()} de inventario`,
        usuario_id: userId
      });

      await this.loadData();
      this.closeModal();

    } catch (err: any) {
      console.error('Error en movimiento:', err);
      this.error.set(err?.message || 'Error al procesar movimiento');
    } finally {
      this.loading.set(false);
    }
  }

  // Helper para obtener usuarios de logística
  private async getLogisticaUsers(): Promise<string[]> {
    try {
      const { data, error } = await this._supabaseService.client
        .from('profiles')
        .select('id')
        .eq('role', 'logistica')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching logistica users:', error);
        return [];
      }

      return (data || []).map((user: any) => user.id);
    } catch (error) {
      console.error('❌ Exception getting logistica users:', error);
      return [];
    }
  }

  getStockColor(producto: any): string {
    if (producto.stock_total === 0) return 'text-red-600';
    if (producto.stock_bajo) return 'text-yellow-600';
    return 'text-green-600';
  }

  getStockIcon(producto: any): string {
    if (producto.stock_total === 0) return '❌';
    if (producto.stock_bajo) return '⚠️';
    return '✅';
  }

  // ✅ Función para formatear nombres de ubicación
  formatUbicacion(ubicacion: string): string {
    const ubicacionesMap: { [key: string]: string } = {
      'sede_principal': 'Sede Principal',
      'bodega': 'Bodega',
      'sede_secundaria': 'Sede Secundaria'
    };
    
    return ubicacionesMap[ubicacion] || ubicacion;
  }

  // ✅ Función para colorear la pill de categoría
  categoriaPill(cat?: string): string {
    const key = (cat || '').toLowerCase();
    const map: Record<string, string> = {
      'trauma': 'bg-pink-300 text-[#10284C]',
      'consumibles': 'bg-fuchsia-300 text-[#10284C]',
      'fijación externa': 'bg-rose-300 text-[#10284C]',
      'fijacion_externa': 'bg-rose-300 text-[#10284C]',
      'osteosintesis': 'bg-purple-300 text-[#10284C]',
      'columna': 'bg-indigo-300 text-[#10284C]'
    };
    return map[key] || 'bg-[#0098A8] text-white';
  }
}