import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CotizacionService } from '../../../../shared/services/cotizacion.service';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { ClientesService, Cliente } from '../../../internal/clientes/data-acces/clientes.service';
import { HospitalesService } from '../../agenda/data-access/hospitales.service';
import { TiposCirugiaService } from '../../agenda/data-access/tipos-cirugia.service';
import { Hospital, TipoCirugia } from '../../agenda/data-access/models';
import { 
  CreateCotizacionDTO, 
  UpdateCotizacionDTO,
  TERMINOS_CONDICIONES_DEFAULT 
} from '../../../../shared/models/cotizacion.model';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
}

@Component({
  selector: 'app-cotizacion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cotizacion-form.component.html'
})
export class CotizacionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cotizacionService = inject(CotizacionService);
  private supabase = inject(SupabaseService);
  private clientesService = inject(ClientesService);
  private hospitalesService = inject(HospitalesService);
  private tiposCirugiaService = inject(TiposCirugiaService);

  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  cotizacionId = signal<string | null>(null);
  isEditing = computed(() => !!this.cotizacionId());

  // Cliente
  clienteEncontrado = signal<Cliente | null>(null);
  buscandoCliente = signal(false);
  
  // Datos para selectores
  productos = signal<Producto[]>([]);
  hospitales = signal<Hospital[]>([]);
  tiposCirugia = signal<TipoCirugia[]>([]);
  
  // Totales calculados (señales reactivas)
  subtotalSignal = signal<number>(0);
  descuentoSignal = signal<number>(0);
  totalSignal = signal<number>(0);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      // Cliente
      documento_numero: ['', Validators.required],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      cliente_id: ['', Validators.required], // Hidden, se llena automáticamente
      email: ['', [Validators.email]], // Email del cliente (opcional pero recomendado)
      telefono: [''], // Teléfono del cliente (opcional)
      
      // Información de cirugía (para cuando se apruebe)
      hospital_id: [''],
      tipo_cirugia_id: [''],
      medico_cirujano: [''],
      fecha_programada: [''],
      
      items: this.fb.array([], Validators.minLength(1)),
      costo_transporte: [0],
      tipo_descuento: ['ninguno'],
      descuento: [0],
      porcentaje_descuento: [0],
      fecha_vencimiento: ['', Validators.required],
      terminos_condiciones: [TERMINOS_CONDICIONES_DEFAULT],
      notas: ['']
    });
    
    // Suscribirse a cambios en items para recalcular totales
    this.items.valueChanges.subscribe(() => {
      this.calcularTotales();
    });
    
    // Suscribirse a cambios en descuento/transporte
    this.form.get('costo_transporte')?.valueChanges.subscribe(() => this.calcularTotales());
    this.form.get('descuento')?.valueChanges.subscribe(() => this.calcularTotales());
    this.form.get('porcentaje_descuento')?.valueChanges.subscribe(() => this.calcularTotales());
    this.form.get('tipo_descuento')?.valueChanges.subscribe(() => this.calcularTotales());
  }

  ngOnInit() {
    this.cargarDatos();
    
    // Verificar si es edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cotizacionId.set(id);
      this.cargarCotizacion(id);
    } else {
      // Fecha de vencimiento por defecto (15 días)
      const fechaVenc = new Date();
      fechaVenc.setDate(fechaVenc.getDate() + 15);
      this.form.patchValue({
        fecha_vencimiento: fechaVenc.toISOString().split('T')[0]
      });
    }
  }

  async cargarDatos() {
    try {
      // Cargar productos
      const { data: productosData, error: productosError } = await this.supabase
        .client
        .from('productos')
        .select('id, nombre, precio')
        .eq('es_activo', true)
        .order('nombre');

      if (productosError) throw productosError;
      this.productos.set(productosData || []);
      
      // Cargar hospitales
      this.hospitalesService.getHospitales().subscribe({
        next: (hospitales) => {
          this.hospitales.set(hospitales);
        },
        error: (err) => console.error('Error cargando hospitales:', err)
      });
      
      // Cargar tipos de cirugía
      this.tiposCirugiaService.getTiposCirugia().subscribe({
        next: (tipos) => {
          this.tiposCirugia.set(tipos);
        },
        error: (err) => console.error('Error cargando tipos cirugía:', err)
      });
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      this.error.set('Error cargando datos: ' + err.message);
    }
  }

  onDocumentoChange() {
    const documento = this.form.get('documento_numero')?.value;
    if (documento && documento.length >= 6) {
      this.buscarClientePorDocumento(documento);
    } else {
      this.clienteEncontrado.set(null);
      this.limpiarCamposCliente();
    }
  }

  private buscarClientePorDocumento(documento: string) {
    this.buscandoCliente.set(true);
    this.clientesService.buscarPorDocumento(documento).subscribe({
      next: (cliente) => {
        if (cliente) {
          this.clienteEncontrado.set(cliente);
          this.llenarCamposCliente(cliente);
        } else {
          this.clienteEncontrado.set(null);
        }
        this.buscandoCliente.set(false);
      },
      error: (error) => {
        console.error('❌ Error buscando cliente:', error);
        this.clienteEncontrado.set(null);
        this.buscandoCliente.set(false);
      }
    });
  }

  private llenarCamposCliente(cliente: any) {
    this.form.patchValue({
      cliente_id: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email || '',
      telefono: cliente.telefono || ''
    });
  }

  private limpiarCamposCliente() {
    this.form.patchValue({
      cliente_id: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: ''
    });
  }

  private async cargarDocumentoCliente(clienteId: string) {
    try {
      const { data, error } = await this.supabase
        .client
        .from('clientes')
        .select('documento_numero')
        .eq('id', clienteId)
        .single();

      if (!error && data) {
        this.form.patchValue({
          documento_numero: data.documento_numero
        });
      }
    } catch (err) {
      console.error('Error cargando documento cliente:', err);
    }
  }

  async cargarCotizacion(id: string) {
    this.loading.set(true);
    this.cotizacionService.getCotizacionById(id).subscribe({
      next: (cotizacion) => {
        if (!cotizacion) {
          this.error.set('Cotización no encontrada');
          this.loading.set(false);
          return;
        }

        // Solo permitir editar borradores
        if (cotizacion.estado !== 'borrador') {
          this.error.set('Solo se pueden editar cotizaciones en borrador');
          this.loading.set(false);
          return;
        }

        // Rellenar formulario
        this.form.patchValue({
          nombre: cotizacion.cliente?.nombre || '',
          apellido: cotizacion.cliente?.apellido || '',
          cliente_id: cotizacion.cliente_id,
          costo_transporte: cotizacion.costo_transporte,
          descuento: cotizacion.descuento,
          porcentaje_descuento: cotizacion.porcentaje_descuento,
          fecha_vencimiento: cotizacion.fecha_vencimiento,
          terminos_condiciones: cotizacion.terminos_condiciones,
          notas: cotizacion.notas_internas
        });

        // Cargar documento del cliente desde la BD
        if (cotizacion.cliente_id) {
          this.cargarDocumentoCliente(cotizacion.cliente_id);
        }

        // Marcar cliente como encontrado si existe
        if (cotizacion.cliente) {
          this.clienteEncontrado.set(cotizacion.cliente as any);
        }

        // Determinar tipo de descuento
        if (cotizacion.porcentaje_descuento > 0) {
          this.form.patchValue({ tipo_descuento: 'porcentaje' });
        } else if (cotizacion.descuento > 0) {
          this.form.patchValue({ tipo_descuento: 'fijo' });
        }

        // Cargar items
        if (cotizacion.items) {
          cotizacion.items.forEach(item => {
            this.agregarItem(item);
          });
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando cotización:', err);
        this.error.set('Error cargando cotización');
        this.loading.set(false);
      }
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  getItemGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  agregarItem(itemData?: any) {
    const itemGroup = this.fb.group({
      producto_id: [itemData?.producto_id || '', Validators.required],
      descripcion: [itemData?.descripcion || '', Validators.required],
      cantidad: [itemData?.cantidad || 1, [Validators.required, Validators.min(1)]],
      precio_unitario: [itemData?.precio_unitario || 0, [Validators.required, Validators.min(0)]],
      precio_total: [itemData?.precio_total || 0]
    });

    this.items.push(itemGroup);
    
    if (itemData) {
      this.calcularTotalItem(this.items.length - 1);
    }
  }

  eliminarItem(index: number) {
    this.items.removeAt(index);
    this.calcularTotales();
  }

  onProductoChange(event: any, index: number) {
    const productoId = event.target.value;
    const producto = this.productos().find(p => p.id === productoId);
    
    if (producto) {
      const itemGroup = this.getItemGroup(index);
      itemGroup.patchValue({
        descripcion: producto.nombre,
        precio_unitario: producto.precio
      });
      this.calcularTotalItem(index);
    }
  }

  calcularTotalItem(index: number) {
    const itemGroup = this.getItemGroup(index);
    const cantidad = itemGroup.get('cantidad')?.value || 0;
    const precioUnitario = itemGroup.get('precio_unitario')?.value || 0;
    const total = cantidad * precioUnitario;
    
    itemGroup.patchValue({ precio_total: total }, { emitEvent: false });
    this.calcularTotales();
  }

  calcularTotales() {
    // Calcular subtotal
    let subtotal = 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.getItemGroup(i);
      const cantidad = item.get('cantidad')?.value || 0;
      const precioUnitario = item.get('precio_unitario')?.value || 0;
      subtotal += cantidad * precioUnitario;
    }
    this.subtotalSignal.set(subtotal);
    
    // Calcular descuento
    const tipoDescuento = this.form.get('tipo_descuento')?.value;
    let descuento = 0;
    if (tipoDescuento === 'porcentaje') {
      const porcentaje = this.form.get('porcentaje_descuento')?.value || 0;
      descuento = subtotal * (porcentaje / 100);
    } else if (tipoDescuento === 'fijo') {
      descuento = this.form.get('descuento')?.value || 0;
    }
    this.descuentoSignal.set(descuento);
    
    // Calcular total
    const transporte = this.form.get('costo_transporte')?.value || 0;
    const total = subtotal + transporte - descuento;
    this.totalSignal.set(total);
  }

  // Getters para mantener compatibilidad con el template
  subtotal() {
    return this.subtotalSignal();
  }

  descuentoCalculado() {
    return this.descuentoSignal();
  }

  totalCalculado() {
    return this.totalSignal();
  }

  onTipoDescuentoChange() {
    const tipo = this.form.get('tipo_descuento')?.value;
    
    if (tipo === 'ninguno') {
      this.form.patchValue({
        descuento: 0,
        porcentaje_descuento: 0
      }, { emitEvent: false });
    } else if (tipo === 'porcentaje') {
      this.form.patchValue({ descuento: 0 }, { emitEvent: false });
    } else if (tipo === 'fijo') {
      this.form.patchValue({ porcentaje_descuento: 0 }, { emitEvent: false });
    }
    
    this.calcularTotales();
  }

  minFechaVencimiento(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  formatMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  async guardarBorrador() {
    if (this.items.length === 0) {
      alert('Debes agregar al menos un item');
      return;
    }

    if (!this.form.get('cliente_id')?.value) {
      alert('Debes seleccionar un cliente');
      return;
    }

    await this.guardar('borrador');
  }

  async onSubmit() {
    // Este método ahora solo guarda como borrador
    // El envío se hará desde el componente de detalle
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (this.items.length === 0) {
      alert('Debes agregar al menos un item');
      return;
    }

    await this.guardar('borrador');
  }

  private async guardar(estado: 'borrador' | 'enviada') {
    this.submitting.set(true);
    this.error.set(null);

    try {
      const formValue = this.form.value;
      const tipo = formValue.tipo_descuento;

      const dto: CreateCotizacionDTO | UpdateCotizacionDTO = {
        cliente_id: formValue.cliente_id,
        // Campos de cirugía (opcionales)
        hospital_id: formValue.hospital_id || null,
        tipo_cirugia_id: formValue.tipo_cirugia_id || null,
        medico_cirujano: formValue.medico_cirujano || null,
        fecha_programada: formValue.fecha_programada || null,
        
        items: formValue.items.map((item: any) => ({
          producto_id: item.producto_id || null,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        })),
        costo_transporte: formValue.costo_transporte || 0,
        descuento: tipo === 'fijo' ? formValue.descuento : 0,
        porcentaje_descuento: tipo === 'porcentaje' ? formValue.porcentaje_descuento : 0,
        fecha_vencimiento: formValue.fecha_vencimiento,
        terminos_condiciones: formValue.terminos_condiciones,
        notas_internas: formValue.notas
      };

      let resultado;
      if (this.isEditing()) {
        resultado = await this.cotizacionService.updateCotizacion(
          this.cotizacionId()!,
          dto as UpdateCotizacionDTO
        );
        
        // Si queremos cambiar el estado después de actualizar
        if (estado === 'enviada') {
          await this.cotizacionService.cambiarEstado(this.cotizacionId()!, {
            estado: 'enviada',
            comentario: 'Cotización enviada al cliente'
          });
        }
      } else {
        resultado = await this.cotizacionService.createCotizacion(dto as CreateCotizacionDTO);
        
        // Si queremos enviar directamente (no como borrador)
        if (estado === 'enviada' && resultado.cotizacion) {
          await this.cotizacionService.cambiarEstado(resultado.cotizacion.id, {
            estado: 'enviada',
            comentario: 'Cotización enviada al cliente'
          });
        }
      }

      if (resultado.exito) {
        const mensaje = estado === 'borrador' 
          ? 'Cotización guardada como borrador' 
          : 'Cotización enviada al cliente';
        alert(mensaje);
        this.router.navigate(['/internal/cotizaciones']);
      } else {
        this.error.set(resultado.mensaje || 'Error al guardar');
      }
    } catch (err: any) {
      console.error('Error guardando cotización:', err);
      this.error.set('Error al guardar la cotización');
    } finally {
      this.submitting.set(false);
    }
  }
}
