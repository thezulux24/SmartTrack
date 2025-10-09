import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { HojaGastoService } from '../../hojas-gasto/data-access/hoja-gasto.service';
import { CreateHojaGastoRequest, HojaGastoItem } from '../../hojas-gasto/data-access/hoja-gasto.model';

interface ProductoCirugia {
  id: string;
  producto_id: string;
  nombre: string;
  codigo: string;
  cantidad_preparada: number;
  cantidad_enviada: number;
  cantidad_utilizada: number;
  lote?: string;
  fecha_vencimiento?: string;
}

interface CirugiaDetalle {
  id: string;
  numero_cirugia: string;
  medico_cirujano: string;
  fecha_programada: string;
  estado: string;
  hospital: {
    nombre: string;
    ciudad: string;
  };
  cliente: {
    nombre: string;
    apellido: string;
  };
  kit: {
    id: string;
    numero_kit: string;
    estado: string;
  };
}

@Component({
  selector: 'app-cirugia-ejecucion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cirugia-ejecucion.component.html',
  styleUrl: './cirugia-ejecucion.component.css'
})
export class CirugiaEjecucionComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);
  private hojaGastoService = inject(HojaGastoService);

  // Signals
  cirugia = signal<CirugiaDetalle | null>(null);
  productos = signal<ProductoCirugia[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  procesando = signal(false);

  // Computed
  cirugiaId = computed(() => this.route.snapshot.params['cirugiaId']);
  totalProductos = computed(() => this.productos().length);
  productosUtilizados = computed(() => 
    this.productos().filter(p => p.cantidad_utilizada > 0).length
  );
  porcentajeProgreso = computed(() => {
    const total = this.totalProductos();
    if (total === 0) return 0;
    return Math.round((this.productosUtilizados() / total) * 100);
  });

  // Exponer Math para el template
  Math = Math;

  async ngOnInit() {
    await this.cargarDatosCirugia();
  }

  async cargarDatosCirugia() {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const cirugiaId = this.cirugiaId();

      // 1. Cargar datos de la cirugía
      const { data: cirugiaData, error: cirugiaError } = await this.supabase.client
        .from('cirugias')
        .select(`
          id,
          numero_cirugia,
          medico_cirujano,
          fecha_programada,
          estado,
          hospitales (
            nombre,
            ciudad
          ),
          clientes (
            nombre,
            apellido
          )
        `)
        .eq('id', cirugiaId)
        .single();

      if (cirugiaError) throw cirugiaError;

      // 2. Obtener el kit de esta cirugía
      const { data: kitData, error: kitError } = await this.supabase.client
        .from('kits_cirugia')
        .select('id, numero_kit, estado')
        .eq('cirugia_id', cirugiaId)
        .single();

      if (kitError) throw kitError;

      const hospital = cirugiaData.hospitales as any;
      const cliente = cirugiaData.clientes as any;

      const cirugia: CirugiaDetalle = {
        id: cirugiaData.id,
        numero_cirugia: cirugiaData.numero_cirugia,
        medico_cirujano: cirugiaData.medico_cirujano,
        fecha_programada: cirugiaData.fecha_programada,
        estado: cirugiaData.estado,
        hospital: {
          nombre: hospital?.nombre || 'N/A',
          ciudad: hospital?.ciudad || 'N/A'
        },
        cliente: {
          nombre: cliente?.nombre || 'N/A',
          apellido: cliente?.apellido || ''
        },
        kit: {
          id: kitData.id,
          numero_kit: kitData.numero_kit,
          estado: kitData.estado
        }
      };

      this.cirugia.set(cirugia);

      // 3. Cargar productos del kit
      const { data: productosData, error: productosError } = await this.supabase.client
        .from('kit_productos')
        .select(`
          id,
          producto_id,
          cantidad_preparada,
          cantidad_enviada,
          cantidad_utilizada,
          lote,
          fecha_vencimiento,
          productos (
            nombre,
            codigo
          )
        `)
        .eq('kit_id', kitData.id)
        .order('productos(nombre)');

      if (productosError) throw productosError;

      const productos: ProductoCirugia[] = (productosData || []).map((p: any) => ({
        id: p.id,
        producto_id: p.producto_id,
        nombre: p.productos?.nombre || 'N/A',
        codigo: p.productos?.codigo || 'N/A',
        cantidad_preparada: p.cantidad_preparada || 0,
        cantidad_enviada: p.cantidad_enviada || 0,
        cantidad_utilizada: p.cantidad_utilizada || 0,
        lote: p.lote,
        fecha_vencimiento: p.fecha_vencimiento
      }));

      this.productos.set(productos);

    } catch (err: any) {
      console.error('Error cargando datos de cirugía:', err);
      this.error.set('Error al cargar los datos de la cirugía');
    } finally {
      this.cargando.set(false);
    }
  }

  async actualizarConsumo(producto: ProductoCirugia, nuevaCantidad: number) {
    try {
      const { error } = await this.supabase.client
        .from('kit_productos')
        .update({ cantidad_utilizada: nuevaCantidad })
        .eq('id', producto.id);

      if (error) throw error;

      // Actualizar en el signal
      const prods = this.productos();
      const index = prods.findIndex(p => p.id === producto.id);
      if (index !== -1) {
        const updated = [...prods];
        updated[index] = { ...updated[index], cantidad_utilizada: nuevaCantidad };
        this.productos.set(updated);
      }

    } catch (err: any) {
      console.error('Error actualizando consumo:', err);
      alert('Error al actualizar el consumo');
    }
  }

  async finalizarCirugia() {
    if (!confirm('¿Finalizar cirugía?\n\nEsto marcará la cirugía como completada, el kit quedará listo para devolución y se creará automáticamente la hoja de gasto con los productos utilizados.')) {
      return;
    }

    this.procesando.set(true);

    try {
      const currentUserId = await this.supabase.getCurrentUserId();
      if (!currentUserId) throw new Error('Usuario no autenticado');

      const cirugia = this.cirugia();
      if (!cirugia) throw new Error('No hay datos de cirugía');

      // 1. Actualizar estado de la cirugía
      const { error: cirugiaError} = await this.supabase.client
        .from('cirugias')
        .update({
          estado: 'completada',
          updated_at: new Date().toISOString()
        })
        .eq('id', cirugia.id);

      if (cirugiaError) throw cirugiaError;

      // 2. Actualizar estado del kit (listo para devolución)
      const { error: kitError } = await this.supabase.client
        .from('kits_cirugia')
        .update({
          estado: 'devuelto',
          fecha_devolucion: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', cirugia.kit.id);

      if (kitError) throw kitError;

      // 3. Crear hoja de gasto automáticamente con productos UTILIZADOS
      const productosUtilizados = this.productos().filter(p => p.cantidad_utilizada > 0);
      
      let hojaGastoCreada = false;
      if (productosUtilizados.length > 0) {
        console.log('📝 Creando hoja de gasto automática con productos utilizados:', productosUtilizados);
        
        try {
          // Obtener información de precios desde la tabla productos
          const productosConPrecio: Omit<HojaGastoItem, 'hoja_gasto_id'>[] = await Promise.all(
            productosUtilizados.map(async (producto) => {
              const { data: productoData } = await this.supabase.client
                .from('productos')
                .select('precio')
                .eq('id', producto.producto_id)
                .single();

              const precio = productoData?.precio || 0;
              
              return {
                producto_id: producto.producto_id,
                categoria: 'productos' as const,
                descripcion: `${producto.nombre} (${producto.codigo})`,
                cantidad: producto.cantidad_utilizada,
                precio_unitario: precio,
                precio_total: precio * producto.cantidad_utilizada,
                observaciones: `Lote: ${producto.lote || 'N/A'}${producto.fecha_vencimiento ? ' - Venc: ' + producto.fecha_vencimiento : ''}`
              };
            })
          );

          const createHojaGastoRequest: CreateHojaGastoRequest = {
            cirugia_id: cirugia.id,
            tecnico_id: currentUserId,
            fecha_cirugia: new Date(cirugia.fecha_programada).toISOString().split('T')[0],
            observaciones: `Hoja de gasto generada automáticamente al finalizar la cirugía ${cirugia.numero_cirugia}`,
            items: productosConPrecio as HojaGastoItem[]
          };

          // Crear la hoja de gasto y ESPERAR a que termine
          await new Promise<void>((resolve, reject) => {
            this.hojaGastoService.createHojaGasto(createHojaGastoRequest).subscribe({
              next: (hojaCreada) => {
                console.log('✅ Hoja de gasto creada automáticamente:', hojaCreada);
                hojaGastoCreada = true;
                resolve();
              },
              error: (error) => {
                console.error('⚠️ Error al crear hoja de gasto automática:', error);
                reject(error);
              }
            });
          });
        } catch (hojaGastoError: any) {
          console.error('❌ Error crítico al crear hoja de gasto:', hojaGastoError);
          alert('⚠️ Advertencia: La cirugía se completó pero hubo un error al crear la hoja de gasto.\n\nError: ' + (hojaGastoError.message || 'Error desconocido') + '\n\nDeberá crear la hoja de gasto manualmente.');
        }
      } else {
        console.log('⚠️ No hay productos utilizados, no se creará hoja de gasto');
      }

      // 4. Registrar en trazabilidad
      const { error: trazError } = await this.supabase.client
        .from('cirugia_trazabilidad')
        .insert({
          cirugia_id: cirugia.id,
          accion: 'finalizacion_cirugia',
          estado_anterior: 'en_curso',
          estado_nuevo: 'completada',
          usuario_id: currentUserId,
          observaciones: `Cirugía finalizada - Kit listo para devolución - Hoja de gasto ${hojaGastoCreada ? 'creada automáticamente' : 'NO creada'} con ${productosUtilizados.length} productos utilizados`,
          metadata: {
            kit_id: cirugia.kit.id,
            productos_utilizados: this.productosUtilizados(),
            total_productos: this.totalProductos(),
            hoja_gasto_creada: hojaGastoCreada
          }
        });

      if (trazError) throw trazError;

      // Mensaje personalizado según si se creó o no la hoja de gasto
      let mensaje = '✅ Cirugía finalizada correctamente\n\n';
      
      if (hojaGastoCreada) {
        mensaje += `📋 Hoja de gasto creada automáticamente con ${productosUtilizados.length} producto(s) utilizado(s)\n\n`;
      } else if (productosUtilizados.length === 0) {
        mensaje += '⚠️ No se creó hoja de gasto (no hay productos utilizados)\n\n';
      }
      
      mensaje += '� Próximos pasos:\n' +
        '1. Validar devolución del kit\n' +
        '2. Separar productos usados/sin usar\n' +
        '3. Enviar productos reutilizables a limpieza/esterilización\n' +
        '4. Actualizar inventario\n\n';
      
      if (hojaGastoCreada) {
        mensaje += 'El personal logístico puede agregar gastos adicionales (transporte, etc.) en el módulo de Hojas de Gasto.';
      }

      alert(mensaje);
      this.router.navigate(['/internal/tecnico']);

    } catch (error: any) {
      console.error('Error finalizando cirugía:', error);
      alert('Error al finalizar la cirugía: ' + (error.message || 'Error desconocido'));
    } finally {
      this.procesando.set(false);
    }
  }

  regresar() {
    this.router.navigate(['/internal/tecnico']);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
