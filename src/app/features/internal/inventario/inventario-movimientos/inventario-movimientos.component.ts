import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ProductosService } from '../data-access/productos.service';
import { MovimientoInventario, FiltrosMovimientos } from '../data-access/models/movimiento.model';
import { Producto } from '../data-access/models/producto.model';

@Component({
  selector: 'app-inventario-movimientos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventario-movimientos.component.html',
  styleUrl: './inventario-movimientos.component.css'
})
export class InventarioMovimientosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private productosService = inject(ProductosService);

  // Signals
  loading = signal(false);
  error = signal<string | null>(null);
  movimientos = signal<MovimientoInventario[]>([]);
  productos = signal<Producto[]>([]);
  filteredMovimientos = signal<MovimientoInventario[]>([]);
  resumen = signal<any>(null);

  // Formulario de filtros
  filtrosForm: FormGroup = this.fb.group({
    fecha_desde: [''],
    fecha_hasta: [''],
    tipo: [''],
    producto_id: [''],
    ubicacion: [''],
    search: ['']
  });

  // Opciones
  tiposMovimiento = this.productosService.getTiposMovimiento();
  ubicacionesOrganizadas = this.productosService.getUbicacionesOrganizadas();

  // Estadísticas
  stats = signal({
    totalMovimientos: 0,
    entradasHoy: 0,
    salidasHoy: 0,
    productosAfectados: 0
  });

  ngOnInit() {
    console.log('🚀 InventarioMovimientosComponent iniciando...');
    this.initializeFilters();
    this.loadData();
    this.setupFilterSubscription();
  }

  private initializeFilters() {
    // Configurar fechas por defecto (últimos 30 días)
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    this.filtrosForm.patchValue({
      fecha_desde: hace30Dias.toISOString().split('T')[0],
      fecha_hasta: hoy.toISOString().split('T')[0]
    });
  }

  private setupFilterSubscription() {
    // Suscribirse a cambios en los filtros
    this.filtrosForm.valueChanges.pipe(
      startWith(this.filtrosForm.value),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private loadData() {
    this.loading.set(true);
    this.error.set(null);

    // Cargar movimientos y productos en paralelo
    combineLatest([
      this.productosService.getMovimientos(),
      this.productosService.getProductos()
    ]).subscribe({
      next: ([movimientos, productos]) => {
        console.log('✅ Datos cargados:', { movimientos: movimientos.length, productos: productos.length });
        this.movimientos.set(movimientos);
        this.productos.set(productos);
        this.applyFilters();
        this.calculateStats();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading data:', err);
        this.error.set('Error al cargar los datos: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  private applyFilters() {
    const filtros = this.filtrosForm.value;
    let movimientosFiltrados = [...this.movimientos()];

    // Aplicar filtros
    if (filtros.fecha_desde) {
      movimientosFiltrados = movimientosFiltrados.filter(m => 
        new Date(m.created_at) >= new Date(filtros.fecha_desde)
      );
    }

    if (filtros.fecha_hasta) {
      const fechaHasta = new Date(filtros.fecha_hasta);
      fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
      movimientosFiltrados = movimientosFiltrados.filter(m => 
        new Date(m.created_at) <= fechaHasta
      );
    }

    if (filtros.tipo) {
      movimientosFiltrados = movimientosFiltrados.filter(m => m.tipo === filtros.tipo);
    }

    if (filtros.producto_id) {
      movimientosFiltrados = movimientosFiltrados.filter(m => m.producto_id === filtros.producto_id);
    }

    if (filtros.ubicacion) {
      movimientosFiltrados = movimientosFiltrados.filter(m => 
        m.ubicacion_origen === filtros.ubicacion || m.ubicacion_destino === filtros.ubicacion
      );
    }

    if (filtros.search) {
      const searchTerm = filtros.search.toLowerCase();
      movimientosFiltrados = movimientosFiltrados.filter(m =>
        m.producto?.nombre?.toLowerCase().includes(searchTerm) ||
        m.producto?.codigo?.toLowerCase().includes(searchTerm) ||
        m.usuario?.full_name?.toLowerCase().includes(searchTerm) ||
        m.motivo?.toLowerCase().includes(searchTerm) ||
        m.observaciones?.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredMovimientos.set(movimientosFiltrados);
  }

  private calculateStats() {
    const movimientos = this.movimientos();
    const hoy = new Date().toISOString().split('T')[0];
    
    const movimientosHoy = movimientos.filter(m => 
      new Date(m.created_at).toISOString().split('T')[0] === hoy
    );

    const entradasHoy = movimientosHoy.filter(m => m.tipo === 'entrada').length;
    const salidasHoy = movimientosHoy.filter(m => m.tipo === 'salida').length;
    const productosAfectados = new Set(movimientos.map(m => m.producto_id)).size;

    this.stats.set({
      totalMovimientos: movimientos.length,
      entradasHoy,
      salidasHoy,
      productosAfectados
    });
  }

  // Métodos de utilidad
  getTipoInfo(tipo: string) {
    return this.tiposMovimiento.find(t => t.value === tipo) || 
           { value: tipo, label: tipo, icon: '❓', color: 'text-gray-600' };
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatUbicacion(ubicacion: string | undefined): string {
    if (!ubicacion) return 'No especificada';
    
    const ubicacionesMap: { [key: string]: string } = {
      'sede_principal': 'Sede Principal',
      'bodega': 'Bodega',
      'sede_secundaria': 'Sede Secundaria'
    };
    
    return ubicacionesMap[ubicacion] || ubicacion;
  }

  // Acciones
  limpiarFiltros() {
    this.filtrosForm.reset();
    this.initializeFilters();
  }

  recargarDatos() {
    this.loadData();
  }

  exportarMovimientos() {
    console.log('📊 Exportando movimientos...');
    
    const movimientos = this.filteredMovimientos();
    if (movimientos.length === 0) {
      alert('No hay movimientos para exportar');
      return;
    }

    // Preparar datos para exportación
    const csvData = this.prepararDatosCSV(movimientos);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `movimientos_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private prepararDatosCSV(movimientos: MovimientoInventario[]): string {
    // Encabezados
    const headers = [
      'Fecha',
      'Tipo',
      'Producto',
      'Código',
      'Categoría',
      'Cantidad',
      'Ubicación Origen',
      'Ubicación Destino',
      'Usuario',
      'Motivo',
      'Observaciones',
      'Lote',
      'Fecha Vencimiento',
      'Referencia'
    ];

    // Convertir movimientos a filas CSV
    const rows = movimientos.map(m => [
      this.formatFecha(m.created_at),
      this.getTipoInfo(m.tipo).label,
      m.producto?.nombre || '',
      m.producto?.codigo || '',
      m.producto?.categoria || '',
      m.cantidad.toString(),
      this.formatUbicacion(m.ubicacion_origen),
      this.formatUbicacion(m.ubicacion_destino),
      m.usuario?.full_name || '',
      m.motivo || '',
      m.observaciones || '',
      m.lote || '',
      m.fecha_vencimiento ? this.formatFechaCorta(m.fecha_vencimiento) : '',
      m.referencia || ''
    ]);

    // Combinar encabezados y filas
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  volverAtras() {
    this.router.navigate(['/internal/inventario']);
  }

  verDetalleProducto(productoId: string) {
    // TODO: Navegar al detalle del producto
    console.log('🔍 Ver detalle producto:', productoId);
  }

  // Métodos para estadísticas rápidas
  getMovimientosPorTipo() {
    const movimientos = this.filteredMovimientos();
    const tipos = this.tiposMovimiento.map(t => t.value);
    
    return tipos.map(tipo => ({
      tipo,
      cantidad: movimientos.filter(m => m.tipo === tipo).length,
      info: this.getTipoInfo(tipo)
    }));
  }

  getProductosMasMovidos() {
    const movimientos = this.filteredMovimientos();
    const productosCount: { [key: string]: number } = {};
    
    movimientos.forEach(m => {
      if (m.producto_id) {
        productosCount[m.producto_id] = (productosCount[m.producto_id] || 0) + 1;
      }
    });

    return Object.entries(productosCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([productoId, cantidad]) => {
        const producto = this.productos().find(p => p.id === productoId);
        return {
          producto: producto?.nombre || 'Producto no encontrado',
          codigo: producto?.codigo || '',
          cantidad
        };
      });
  }
}
