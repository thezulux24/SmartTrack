import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KitService } from '../../../../shared/services/kit.service';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { CreateKitRequest } from '../../../../shared/models/kit.model';

@Component({
  selector: 'app-kit-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
  cirugia = signal<any>(null);
  productosSugeridos = signal<any[]>([]);
  productosEncontrados = signal<any[]>([]);
  productosSeleccionados = signal<any[]>([]);

  // Form
  form = this.fb.group({
    productos: this.fb.array([]),
    observaciones_generales: ['']
  });

  // Propiedades
  busquedaProducto = '';
  cirugiaId = '';

  // Computed
  productosFormArray = computed(() => this.form.get('productos') as FormArray);

  ngOnInit() {
    this.cirugiaId = this.route.snapshot.paramMap.get('id') || '';
    if (this.cirugiaId) {
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

  async buscarProductos() {
    if (this.busquedaProducto.length < 2) {
      this.productosEncontrados.set([]);
      return;
    }

    try {
      const { data: productos, error } = await this.supabase.client
        .from('productos')
        .select(`
          *,
          inventario:inventario(cantidad)
        `)
        .or(`nombre.ilike.%${this.busquedaProducto}%,codigo.ilike.%${this.busquedaProducto}%`)
        .eq('es_activo', true)
        .limit(10);

      if (error) throw error;

      // Calcular stock disponible y filtrar ya seleccionados
      const productosConStock = productos?.map(p => ({
        ...p,
        stock_disponible: p.inventario?.reduce((sum: number, inv: any) => sum + inv.cantidad, 0) || 0
      })).filter(p => !this.productosSeleccionados().some(ps => ps.id === p.id)) || [];

      this.productosEncontrados.set(productosConStock);
    } catch (error) {
      console.error('Error buscando productos:', error);
    }
  }

  agregarProducto(producto: any) {
    const productosArray = this.form.get('productos') as FormArray;
    
    // Verificar que no esté ya agregado
    if (this.productosSeleccionados().some(p => p.id === producto.id)) {
      return;
    }

    const productoForm = this.fb.group({
      producto_id: [producto.id, Validators.required],
      cantidad_solicitada: [1, [Validators.required, Validators.min(1)]],
      observaciones: ['']
    });

    productosArray.push(productoForm);
    this.productosSeleccionados.update(productos => [...productos, producto]);
    
    // Limpiar búsqueda
    this.busquedaProducto = '';
    this.productosEncontrados.set([]);
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

  async onSubmit() {
    if (!this.form.valid || this.productosFormArray().length === 0) return;

    try {
      this.creandoKit.set(true);
      this.error.set(null);

      const formValue = this.form.value;
      const request: CreateKitRequest = {
        cirugia_id: this.cirugiaId,
        productos: (formValue.productos as any[]) || [],
        observaciones: formValue.observaciones_generales || undefined
      };

      await firstValueFrom(this.kitService.crearKit(request));
      
      // Navegar de vuelta a la agenda
      this.router.navigate(['/internal/agenda']);
      
    } catch (error: any) {
      console.error('Error creando kit:', error);
      this.error.set(error.message || 'Error creando el kit');
    } finally {
      this.creandoKit.set(false);
    }
  }

  volver() {
    this.router.navigate(['/internal/agenda']);
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
}