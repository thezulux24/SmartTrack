import { Component, OnInit, inject, signal, computed, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KitService } from '../../../../shared/services/kit.service';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { CreateKitRequest } from '../../../../shared/models/kit.model';
import { KitSuccessDialogComponent } from '../components/kit-success-dialog.component';

@Component({
  selector: 'app-kit-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, KitSuccessDialogComponent],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './kit-builder.component.html',
  styleUrl: './kit-builder.component.css'
})
export class KitBuilderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kitService = inject(KitService);
  private readonly supabase = inject(SupabaseService);

  // Signals
  loading = signal(true);
  error = signal<string | null>(null);
  creandoKit = signal(false);
  showSuccessDialog = signal(false);
  cirugia = signal<any>(null);
  productosSugeridos = signal<any[]>([]);
  productosEncontrados = signal<any[]>([]);
  productosSeleccionados = signal<any[]>([]);
  categorias = signal<string[]>([]);
  marcas = signal<string[]>([]);

  // Form
  form = this.fb.group({
    productos: this.fb.array([]),
    observaciones_generales: ['']
  });

  // Propiedades
  busquedaProducto = '';
  cirugiaId = '';
  kitId = '';
  modoEdicion = false;
  categoriaSeleccionada = '';
  marcaSeleccionada = '';
  filtroStock = '';
  todosLosProductos: any[] = [];

  // Computed
  productosFormArray = computed(() => this.form.get('productos') as FormArray);

  ngOnInit() {
    this.cirugiaId = this.route.snapshot.paramMap.get('id') || '';
    
    // Detectar si está en modo edición basado en la URL
    this.modoEdicion = this.route.snapshot.url.some(segment => segment.path === 'edit');
    
    if (this.modoEdicion) {
      // En modo edición, el id es el kitId
      this.kitId = this.cirugiaId;
      this.cargarDatosEdicion();
    } else if (this.cirugiaId) {
      // En modo creación, el id es el cirugiaId
      this.cargarDatos();
    } else {
      this.error.set('ID de cirugía no proporcionado');
      this.loading.set(false);
    }
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Cargar información de la cirugía
      const { data: cirugia, error: cirugiaError } = await this.supabase.client
        .from('cirugias')
        .select(`
          *,
          hospital:hospitales(*),
          tipo_cirugia:tipos_cirugia(*)
        `)
        .eq('id', this.cirugiaId)
        .single();

      if (cirugiaError) throw cirugiaError;
      this.cirugia.set(cirugia);

      // Cargar productos sugeridos basados en el tipo de cirugía
      if (cirugia.tipo_cirugia?.productos_comunes) {
        await this.cargarProductosSugeridos(cirugia.tipo_cirugia.productos_comunes);
      }

      // Cargar todos los productos para los filtros
      await this.cargarTodosLosProductos();

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      this.error.set(error.message || 'Error cargando la información');
    } finally {
      this.loading.set(false);
    }
  }

  private async cargarProductosSugeridos(productosComunes: any) {
    try {
      const productosIds = Array.isArray(productosComunes) ? productosComunes : [];
      
      if (productosIds.length > 0) {
        const { data: productos, error } = await this.supabase.client
          .from('productos')
          .select(`
            *,
            inventario:inventario(cantidad)
          `)
          .in('id', productosIds)
          .eq('es_activo', true);

        if (error) throw error;

        // Calcular stock disponible
        const productosConStock = productos?.map(p => ({
          ...p,
          stock_disponible: p.inventario?.reduce((sum: number, inv: any) => sum + inv.cantidad, 0) || 0
        })) || [];

        this.productosSugeridos.set(productosConStock);
      }
    } catch (error) {
      console.error('Error cargando productos sugeridos:', error);
    }
  }

  async cargarTodosLosProductos() {
    try {
      const { data: productos, error } = await this.supabase.client
        .from('productos')
        .select(`
          *,
          inventario:inventario(cantidad)
        `)
        .eq('es_activo', true)
        .order('nombre');

      if (error) throw error;

      // Calcular stock disponible
      const productosConStock = productos?.map(p => ({
        ...p,
        stock_total: p.inventario?.reduce((sum: number, inv: any) => sum + inv.cantidad, 0) || 0,
        stock_disponible: p.inventario?.reduce((sum: number, inv: any) => sum + inv.cantidad, 0) || 0
      })) || [];

      this.todosLosProductos = productosConStock;
      
      // Extraer categorías y marcas únicas
      const categoriasUnicas = [...new Set(productosConStock.map(p => p.categoria).filter(Boolean))];
      const marcasUnicas = [...new Set(productosConStock.map(p => p.marca).filter(Boolean))];
      
      this.categorias.set(categoriasUnicas);
      this.marcas.set(marcasUnicas);
      
      // Aplicar filtros iniciales
      this.buscarProductos();
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  }

  buscarProductos() {
    let productosFiltrados = [...this.todosLosProductos];

    // Filtro por búsqueda de texto
    if (this.busquedaProducto.trim()) {
      const termino = this.busquedaProducto.toLowerCase().trim();
      productosFiltrados = productosFiltrados.filter(p => 
        p.nombre?.toLowerCase().includes(termino) ||
        p.codigo?.toLowerCase().includes(termino) ||
        p.descripcion?.toLowerCase().includes(termino)
      );
    }

    // Filtro por categoría
    if (this.categoriaSeleccionada) {
      productosFiltrados = productosFiltrados.filter(p => p.categoria === this.categoriaSeleccionada);
    }

    // Filtro por marca
    if (this.marcaSeleccionada) {
      productosFiltrados = productosFiltrados.filter(p => p.marca === this.marcaSeleccionada);
    }

    // Filtro por stock
    if (this.filtroStock) {
      switch (this.filtroStock) {
        case 'disponible':
          productosFiltrados = productosFiltrados.filter(p => (p.stock_total || 0) > 0);
          break;
        case 'bajo':
          productosFiltrados = productosFiltrados.filter(p => {
            const stock = p.stock_total || 0;
            const minimo = p.stock_minimo || 0;
            return stock > 0 && stock <= minimo;
          });
          break;
        case 'agotado':
          productosFiltrados = productosFiltrados.filter(p => (p.stock_total || 0) === 0);
          break;
      }
    }

    // Limitar resultados para mejor rendimiento
    const resultados = productosFiltrados.slice(0, 20);
    this.productosEncontrados.set(resultados);
  }

  agregarProducto(producto: any) {
    const productosArray = this.form.get('productos') as FormArray;
    
    // Verificar que no esté ya agregado
    if (this.productosSeleccionados().some(p => p.id === producto.id)) {
      return;
    }

    const productoForm = this.fb.group({
      _uniqueId: [Date.now() + Math.random()], // ID único para tracking
      producto_id: [producto.id, Validators.required],
      cantidad_solicitada: [1, [Validators.required, Validators.min(1)]],
      observaciones: ['']
    });

    productosArray.push(productoForm);
    this.productosSeleccionados.update(productos => [...productos, producto]);
    
    // NO limpiar búsqueda para que los productos sigan visibles
    // this.busquedaProducto = '';
    // this.productosEncontrados.set([]);
  }

  removerProducto(index: number) {
    const productosArray = this.form.get('productos') as FormArray;
    productosArray.removeAt(index);
    
    this.productosSeleccionados.update(productos => 
      productos.filter((_, i) => i !== index)
    );
  }

  getProductoNombre(index: number): string {
    return this.productosSeleccionados()[index]?.nombre || '';
  }

  getProductoCodigo(index: number): string {
    return this.productosSeleccionados()[index]?.codigo || '';
  }

  // TrackBy function para productos del FormArray
  trackByProductoId(index: number, item: any): any {
    return item.value?._uniqueId || item.value?.producto_id || index;
  }

  async onSubmit() {
    if (!this.form.valid || this.productosFormArray().length === 0) return;

    try {
      this.creandoKit.set(true);
      this.error.set(null);

      const formValue = this.form.value;

      // Limpiar _uniqueId antes de enviar
      const productosLimpios = (formValue.productos as any[]).map(({ _uniqueId, ...producto }) => producto);

      if (this.modoEdicion) {
        // Modo edición - actualizar kit existente
        const formValueLimpio = { ...formValue, productos: productosLimpios };
        await this.actualizarKit(formValueLimpio);
        // Mostrar diálogo de éxito
        this.showSuccessDialog.set(true);
      } else {
        // Modo creación - crear nuevo kit
        const request: CreateKitRequest = {
          cirugia_id: this.cirugiaId,
          productos: productosLimpios,
          observaciones: formValue.observaciones_generales || undefined
        };

        await firstValueFrom(this.kitService.crearKit(request));
        // Mostrar diálogo de éxito
        this.showSuccessDialog.set(true);
      }
      
    } catch (error: any) {
      console.error('Error procesando kit:', error);
      this.error.set(error.message || 'Error procesando el kit');
    } finally {
      this.creandoKit.set(false);
    }
  }

  volver() {
    this.router.navigate(['/internal/agenda']);
  }

  onSuccessDialogClose() {
    this.showSuccessDialog.set(false);
    this.router.navigate(['/internal/agenda']);
  }

  async cargarDatosEdicion() {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Cargar datos del kit existente
      const kit = await firstValueFrom(this.kitService.getKit(this.kitId));
      const productos = await firstValueFrom(this.kitService.getKitProductos(this.kitId));
      
      // Establecer cirugiaId desde el kit
      this.cirugiaId = kit.cirugia_id;
      
      // Cargar datos de la cirugía
      const { data: cirugia, error: cirugiaError } = await this.supabase.client
        .from('cirugias')
        .select(`
          *,
          hospital:hospitales(*),
          tipo_cirugia:tipos_cirugia(*)
        `)
        .eq('id', this.cirugiaId)
        .single();

      if (cirugiaError) throw cirugiaError;
      this.cirugia.set(cirugia);

      // Cargar todos los productos
      await this.cargarTodosLosProductos();

      // Llenar el formulario con los productos del kit existente
      this.llenarFormularioConProductos(productos);

      // Llenar observaciones generales
      this.form.patchValue({
        observaciones_generales: kit.observaciones || ''
      });

    } catch (error: any) {
      console.error('Error cargando datos para edición:', error);
      this.error.set(error.message || 'Error cargando la información del kit');
    } finally {
      this.loading.set(false);
    }
  }

  private llenarFormularioConProductos(productos: any[]) {
    const productosArray = this.form.get('productos') as FormArray;
    
    // Limpiar productos existentes
    while (productosArray.length !== 0) {
      productosArray.removeAt(0);
    }

    // Agregar productos del kit
    productos.forEach(producto => {
      const productoFormGroup = this.fb.group({
        producto_id: [producto.producto_id, Validators.required],
        nombre: [producto.producto?.nombre || ''],
        codigo: [producto.producto?.codigo || ''],
        cantidad_solicitada: [producto.cantidad_solicitada, [Validators.required, Validators.min(1)]],
        observaciones: [producto.observaciones || '']
      });

      productosArray.push(productoFormGroup);
    });

    // Actualizar la lista de productos seleccionados
    const productosSeleccionados = productos.map(p => ({
      id: p.producto_id,
      nombre: p.producto?.nombre,
      codigo: p.producto?.codigo
    }));
    this.productosSeleccionados.set(productosSeleccionados);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos helper para las cards de productos
  getStockIcon(producto: any): string {
    const stock = producto.stock_total || producto.stock_disponible || 0;
    const minimo = producto.stock_minimo || 0;
    
    if (stock === 0) return '🔴';
    if (stock <= minimo) return '🟡';
    return '🟢';
  }

  getStockColorClass(producto: any): string {
    const stock = producto.stock_total || producto.stock_disponible || 0;
    const minimo = producto.stock_minimo || 0;
    
    if (stock === 0) return 'text-red-600 dark:text-red-400';
    if (stock <= minimo) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  }

  isProductoAgregado(productoId: string): boolean {
    const productos = this.form.get('productos') as FormArray;
    return productos.controls.some(control => control.get('producto_id')?.value === productoId);
  }

  private async actualizarKit(formValue: any) {
    // TODO: Implementar método updateKit en KitService
    // Por ahora, simularemos la actualización eliminando y recreando
    console.log('Actualizando kit:', this.kitId, formValue);
    
    // Actualizar observaciones del kit
    const { error: updateError } = await this.supabase.client
      .from('kits_cirugia')
      .update({
        observaciones: formValue.observaciones_generales || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.kitId);

    if (updateError) throw updateError;

    // Eliminar productos existentes
    const { error: deleteError } = await this.supabase.client
      .from('kit_productos')
      .delete()
      .eq('kit_id', this.kitId);

    if (deleteError) throw deleteError;

    // Insertar productos actualizados
    const productos = (formValue.productos as any[]) || [];
    if (productos.length > 0) {
      const productosParaInsertar = productos.map(p => ({
        kit_id: this.kitId,
        producto_id: p.producto_id,
        cantidad_solicitada: p.cantidad_solicitada,
        cantidad_preparada: 0,
        observaciones: p.observaciones
      }));

      const { error: insertError } = await this.supabase.client
        .from('kit_productos')
        .insert(productosParaInsertar);

      if (insertError) throw insertError;
    }

    // Registrar trazabilidad
    await this.supabase.client
      .from('kit_trazabilidad')
      .insert({
        kit_id: this.kitId,
        usuario_id: '00000000-0000-0000-0000-000000000000', // TODO: Obtener usuario actual
        accion: 'editado',
        estado_nuevo: 'preparando',
        observaciones: 'Kit editado y productos actualizados'
      });
  }

  // Método helper para obtener información del cliente
  getClienteNombre(): string {
    const cirugia = this.cirugia();
    if (!cirugia?.cliente) return 'Sin información';
    
    return `${cirugia.cliente.nombre} ${cirugia.cliente.apellido}`.trim();
  }
}