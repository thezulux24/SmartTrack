import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';
import { KitService } from '../../../../shared/services/kit.service';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { KitCirugia, KitProducto } from '../../../../shared/models/kit.model';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface ProductoPreparacion {
  id: string;
  producto_id: string;
  nombre: string;
  codigo: string;
  cantidad_solicitada: number;
  cantidad_preparada: number;
  stock_disponible: number;
  cantidad_minima: number; // Agregado
  lote: string;
  fecha_vencimiento: string;
  ubicacion_seleccionada: string;
  observaciones: string;
  alerta_stock: boolean;
  alerta_vencimiento: boolean;
  inventarios?: any[]; // Lista de inventarios disponibles por ubicación
}

@Component({
  selector: 'app-kit-preparacion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, QRCodeModule],
  templateUrl: './kit-preparacion.component.html'
})
export class KitPreparacionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private kitService = inject(KitService);
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  kitId = signal<string>('');
  kit = signal<KitCirugia | null>(null);
  productos = signal<ProductoPreparacion[]>([]);
  loading = signal(true);
  procesando = signal(false);
  mostrarQR = signal(false);
  qrCode = signal<string>('');
  qrUrl = signal<string>(''); // URL completa para escanear
  modoVista = signal(false); // Modo solo lectura

  // Estadísticas
  totalProductos = computed(() => this.productos().length);
  productosCompletos = computed(() => 
    this.productos().filter(p => p.cantidad_preparada >= p.cantidad_solicitada).length
  );
  tieneAlertas = computed(() => 
    this.productos().some(p => p.alerta_stock || p.alerta_vencimiento)
  );

  preparacionForm = this.fb.group({
    observaciones: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.kitId.set(id);
      
      // Verificar si viene en modo vista
      this.route.queryParams.subscribe(params => {
        if (params['modo'] === 'ver') {
          this.modoVista.set(true);
        }
      });
      
      this.cargarKit(id);
    }
  }

  async cargarKit(kitId: string) {
    try {
      this.loading.set(true);

      // Cargar kit con todos sus datos relacionados
      const { data: kitData, error: kitError } = await this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(
            numero_cirugia,
            medico_cirujano,
            fecha_programada,
            hospital:hospitales(nombre),
            cliente:clientes(nombre, apellido)
          ),
          productos:kit_productos(
            *,
            producto:productos(
              id,
              codigo,
              nombre,
              categoria,
              stock_minimo,
              inventario(
                id,
                cantidad,
                ubicacion,
                estado,
                fecha_vencimiento
              )
            )
          )
        `)
        .eq('id', kitId)
        .single();

      if (kitError) throw kitError;

      this.kit.set(kitData);

      // Si el kit ya tiene QR code, cargar la URL con hash location
      if (kitData.qr_code) {
        this.qrCode.set(kitData.qr_code);
        this.qrUrl.set(`${environment.PUBLIC_URL}/qr/${kitData.qr_code}`);
      }

      // Procesar productos para preparación
      const productosPrep: ProductoPreparacion[] = (kitData.productos || []).map((kp: any) => {
        const inventariosDisponibles = (kp.producto?.inventario || [])
          .filter((inv: any) => inv.estado === 'disponible' && inv.cantidad > 0);

        const stockTotal = inventariosDisponibles
          .reduce((sum: number, inv: any) => sum + inv.cantidad, 0);

        // Detectar alertas
        const alertaStock = stockTotal < kp.cantidad_solicitada;
        
        // Alertar si algún inventario vence en menos de 30 días
        const hoy = new Date();
        const alertaVencimiento = inventariosDisponibles.some((inv: any) => {
          if (!inv.fecha_vencimiento) return false;
          const diasRestantes = Math.ceil(
            (new Date(inv.fecha_vencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
          );
          return diasRestantes <= 30 && diasRestantes >= 0;
        });

        return {
          id: kp.id,
          producto_id: kp.producto.id,
          nombre: kp.producto.nombre,
          codigo: kp.producto.codigo,
          cantidad_solicitada: kp.cantidad_solicitada,
          cantidad_preparada: kp.cantidad_preparada || 0,
          stock_disponible: stockTotal,
          cantidad_minima: kp.producto.stock_minimo || 0,
          lote: kp.lote || '',
          fecha_vencimiento: kp.fecha_vencimiento || '',
          ubicacion_seleccionada: inventariosDisponibles[0]?.ubicacion || '',
          observaciones: kp.observaciones || '',
          alerta_stock: alertaStock,
          alerta_vencimiento: alertaVencimiento,
          inventarios: inventariosDisponibles
        };
      });

      this.productos.set(productosPrep);
      this.loading.set(false);

    } catch (error) {
      console.error('Error cargando kit:', error);
      alert('Error al cargar el kit');
      this.router.navigate(['/internal/logistica/kits-pendientes']);
    }
  }

  validarCantidad(producto: ProductoPreparacion) {
    if (producto.cantidad_preparada > producto.stock_disponible) {
      producto.cantidad_preparada = producto.stock_disponible;
      alert(`Stock insuficiente. Máximo disponible: ${producto.stock_disponible}`);
    }
    if (producto.cantidad_preparada < 0) {
      producto.cantidad_preparada = 0;
    }
  }

  async finalizarPreparacion() {
    // Validar que al menos un producto tenga cantidad preparada
    const hayProductosPreparados = this.productos().some(p => p.cantidad_preparada > 0);
    
    if (!hayProductosPreparados) {
      alert('Debes preparar al menos un producto');
      return;
    }

    // Confirmar
    const productosIncompletos = this.productos().filter(
      p => p.cantidad_preparada < p.cantidad_solicitada
    );

    if (productosIncompletos.length > 0) {
      const confirmar = confirm(
        `Hay ${productosIncompletos.length} producto(s) con cantidad incompleta. ¿Deseas continuar?`
      );
      if (!confirmar) return;
    }

    try {
      this.procesando.set(true);

      const usuarioId = (await this.supabase.client.auth.getUser()).data.user?.id;
      if (!usuarioId) throw new Error('Usuario no autenticado');

      // 1. Actualizar kit_productos
      for (const prod of this.productos()) {
        if (prod.cantidad_preparada > 0) {
          const { error } = await this.supabase.client
            .from('kit_productos')
            .update({
              cantidad_preparada: prod.cantidad_preparada,
              lote: prod.lote || null,
              fecha_vencimiento: prod.fecha_vencimiento || null,
              observaciones: prod.observaciones || null
            })
            .eq('id', prod.id);

          if (error) throw error;

          // 2. Registrar movimiento de inventario (reserva)
          await this.registrarMovimientoInventario(prod, usuarioId);
        }
      }

      // 3. Generar QR único
      const qrCode = await this.generarQR();

      // 4. Actualizar estado del kit
      const { error: kitError } = await this.supabase.client
        .from('kits_cirugia')
        .update({
          estado: 'listo_envio',
          fecha_preparacion: new Date().toISOString(),
          logistica_id: usuarioId,
          qr_code: qrCode,
          ubicacion_actual: 'bodega_principal',
          observaciones: this.preparacionForm.value.observaciones || null
        })
        .eq('id', this.kitId());

      if (kitError) throw kitError;

      // 5. Registrar trazabilidad
      await this.registrarTrazabilidad('Listo para despacho', 'preparando', 'listo_envio', usuarioId);

      // Mostrar QR con URL completa usando hash location
      this.qrCode.set(qrCode);
      this.qrUrl.set(`${environment.PUBLIC_URL}/qr/${qrCode}`);
      this.mostrarQR.set(true);

    } catch (error) {
      console.error('Error finalizando preparación:', error);
      alert('Error al finalizar la preparación');
    } finally {
      this.procesando.set(false);
    }
  }

  async registrarMovimientoInventario(producto: ProductoPreparacion, usuarioId: string) {
    // Buscar el inventario de la ubicación seleccionada
    const inventarioSeleccionado = producto.inventarios?.find(
      inv => inv.ubicacion === producto.ubicacion_seleccionada
    );

    if (!inventarioSeleccionado) return;

    // Registrar movimiento de salida/reserva
    const { error: movError } = await this.supabase.client
      .from('movimientos_inventario')
      .insert({
        inventario_id: inventarioSeleccionado.id,
        producto_id: producto.producto_id,
        tipo: 'salida',
        cantidad: producto.cantidad_preparada,
        motivo: 'Kit quirúrgico',
        usuario_id: usuarioId,
        ubicacion_origen: producto.ubicacion_seleccionada,
        referencia: this.kit()?.numero_kit,
        lote: producto.lote || null,
        fecha_vencimiento: producto.fecha_vencimiento || null,
        observaciones: `Kit ${this.kit()?.numero_kit} - Preparación para cirugía`
      });

    if (movError) throw movError;

    // Actualizar cantidad en inventario
    const nuevaCantidad = inventarioSeleccionado.cantidad - producto.cantidad_preparada;
    const nuevoEstado = nuevaCantidad <= 0 ? 'agotado' : 'disponible';

    const { error: invError } = await this.supabase.client
      .from('inventario')
      .update({
        cantidad: nuevaCantidad,
        estado: nuevoEstado
      })
      .eq('id', inventarioSeleccionado.id);

    if (invError) throw invError;

    // 📢 Notificar si el stock queda crítico después de preparar el kit
    if (nuevaCantidad <= producto.cantidad_minima) {
      
      const logisticaIds = await this.getLogisticaUsers();
      if (logisticaIds.length > 0) {
        await this.notificationService.notifyLowStock(
          logisticaIds,
          producto.producto_id,
          producto.nombre,
          nuevaCantidad,
          producto.cantidad_minima
        );
      }
    }
  }

  async generarQR(): Promise<string> {
    // Generar código QR único
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const qrCode = `KIT-${this.kit()?.numero_kit}-${random}-${timestamp}`;

    // Guardar en tabla qr_codes
    const { error } = await this.supabase.client
      .from('qr_codes')
      .insert({
        codigo: qrCode,
        tipo: 'kit',
        referencia_id: this.kitId(),
        kit_id: this.kitId(),
        tipo_validacion: 'entrega_cliente',
        es_activo: true
      });

    if (error) throw error;

    return qrCode;
  }

  async registrarTrazabilidad(
    accion: string, 
    estadoAnterior: string, 
    estadoNuevo: string, 
    usuarioId: string
  ) {
    const { error } = await this.supabase.client
      .from('kit_trazabilidad')
      .insert({
        kit_id: this.kitId(),
        accion: accion,
        estado_anterior: estadoAnterior,
        estado_nuevo: estadoNuevo,
        usuario_id: usuarioId,
        ubicacion: 'bodega_principal',
        observaciones: this.preparacionForm.value.observaciones || null
      });

    if (error) throw error;
  }

  imprimirQR() {
    window.print();
  }

  volverAListado() {
    this.router.navigate(['/internal/logistica/kits-pendientes']);
  }

  // Helper para obtener usuarios de logística
  private async getLogisticaUsers(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.client
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

  obtenerColorAlerta(producto: ProductoPreparacion): string {
    if (producto.alerta_stock) return 'red';
    if (producto.alerta_vencimiento) return 'orange';
    return 'green';
  }

  obtenerMensajeAlerta(producto: ProductoPreparacion): string {
    if (producto.alerta_stock) {
      return `⚠️ Stock insuficiente (Disponible: ${producto.stock_disponible})`;
    }
    if (producto.alerta_vencimiento) {
      return '⚠️ Producto próximo a vencer (< 30 días)';
    }
    return '✓ Stock suficiente';
  }
}
