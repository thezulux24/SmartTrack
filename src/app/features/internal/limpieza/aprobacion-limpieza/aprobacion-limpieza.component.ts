import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

interface ProductoAprobacion {
  id: string; // kit_productos_limpieza.id
  kit_producto_id: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string;
  cantidad_a_recuperar: number;
  cantidad_aprobada: number;
  estado_limpieza: string;
  observaciones_limpieza: string;
}

interface KitAprobacion {
  id: string;
  numero_kit: string;
  cirugia_id: string;
  fecha_inicio_limpieza: string;
  estado: string;
  hospital?: { nombre: string };
  medico_cirujano?: string;
  cliente?: { nombre: string; apellido: string };
  productos: ProductoAprobacion[];
}

@Component({
  selector: 'app-aprobacion-limpieza',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aprobacion-limpieza.component.html',
  styleUrl: './aprobacion-limpieza.component.css'
})
export class AprobacionLimpiezaComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  kitsListos = signal<KitAprobacion[]>([]);
  kitSeleccionado = signal<KitAprobacion | null>(null);
  cargando = signal<boolean>(true);
  procesando = signal<boolean>(false);
  error = signal<string>('');
  usuarioId = signal<string>('');

  totalKits = computed(() => this.kitsListos().length);
  totalProductosListos = computed(() => {
    return this.kitsListos().reduce((sum, kit) => {
      return sum + kit.productos.filter(p => p.estado_limpieza === 'esterilizado').length;
    }, 0);
  });

  Math = Math;

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando.set(true);
      this.error.set('');

      const supabase = this.supabaseService.supabaseClient;

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.usuarioId.set(user.id);
      }

      // Cargar kits en estado 'en_limpieza' con productos esterilizados
      const { data: kitsData, error: kitsError } = await supabase
        .from('kits_cirugia')
        .select(`
          id,
          numero_kit,
          cirugia_id,
          estado,
          fecha_inicio_limpieza,
          cirugias!inner(
            id,
            medico_cirujano,
            hospitales(nombre),
            clientes(nombre, apellido)
          )
        `)
        .eq('estado', 'en_limpieza')
        .order('fecha_inicio_limpieza', { ascending: true });

      if (kitsError) throw kitsError;

      const kitsConProductos: KitAprobacion[] = [];

      for (const kit of kitsData || []) {
        const cirugia = (kit.cirugias as any);

        // Cargar productos esterilizados
        const { data: productosData, error: productosError } = await supabase
          .from('kit_productos_limpieza')
          .select(`
            id,
            kit_producto_id,
            producto_id,
            cantidad_a_recuperar,
            cantidad_aprobada,
            estado_limpieza,
            observaciones_limpieza,
            productos!inner(
              nombre,
              codigo
            )
          `)
          .eq('kit_id', kit.id)
          .eq('estado_limpieza', 'esterilizado');

        if (productosError) {
          console.error('Error cargando productos:', productosError);
          continue;
        }

        // Solo incluir kits que tengan productos esterilizados
        if (productosData && productosData.length > 0) {
          const productos: ProductoAprobacion[] = productosData.map((p: any) => ({
            id: p.id,
            kit_producto_id: p.kit_producto_id,
            producto_id: p.producto_id,
            producto_nombre: p.productos.nombre,
            producto_codigo: p.productos.codigo,
            cantidad_a_recuperar: p.cantidad_a_recuperar || 0,
            cantidad_aprobada: p.cantidad_aprobada || p.cantidad_a_recuperar || 0,
            estado_limpieza: p.estado_limpieza,
            observaciones_limpieza: p.observaciones_limpieza || ''
          }));

          kitsConProductos.push({
            id: kit.id,
            numero_kit: kit.numero_kit,
            cirugia_id: kit.cirugia_id,
            fecha_inicio_limpieza: kit.fecha_inicio_limpieza,
            estado: kit.estado,
            hospital: cirugia?.hospitales,
            medico_cirujano: cirugia?.medico_cirujano,
            cliente: cirugia?.clientes,
            productos
          });
        }
      }

      this.kitsListos.set(kitsConProductos);

    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      this.error.set(err.message || 'Error al cargar los datos');
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionarKit(kit: KitAprobacion) {
    this.kitSeleccionado.set(kit);
  }

  cerrarDetalle() {
    this.kitSeleccionado.set(null);
  }

  ajustarCantidadAprobada(producto: ProductoAprobacion, cambio: number) {
    const kit = this.kitSeleccionado();
    if (!kit) return;

    const productoIndex = kit.productos.findIndex(p => p.id === producto.id);
    if (productoIndex !== -1) {
      const nuevaCantidad = Math.max(0, 
        Math.min(producto.cantidad_a_recuperar, producto.cantidad_aprobada + cambio)
      );
      kit.productos[productoIndex].cantidad_aprobada = nuevaCantidad;
      this.kitSeleccionado.set({ ...kit });
    }
  }

  async aprobarYFinalizarKit() {
    const kit = this.kitSeleccionado();
    if (!kit || this.procesando()) return;

    const totalAprobado = kit.productos.reduce((sum, p) => sum + p.cantidad_aprobada, 0);

    const confirmacion = confirm(
      `¿Confirmar aprobación y finalización del kit?\n\n` +
      `Kit: ${kit.numero_kit}\n` +
      `Productos aprobados: ${kit.productos.length}\n` +
      `Cantidad total a recuperar: ${totalAprobado}\n\n` +
      `Esto actualizará el inventario y marcará el kit como FINALIZADO.`
    );

    if (!confirmacion) return;

    try {
      this.procesando.set(true);
      this.error.set('');

      const supabase = this.supabaseService.supabaseClient;
      const errores: string[] = [];

      // 1. Actualizar cada producto en kit_productos_limpieza
      for (const producto of kit.productos) {
        const { error: updateError } = await supabase
          .from('kit_productos_limpieza')
          .update({
            estado_limpieza: 'aprobado',
            cantidad_aprobada: producto.cantidad_aprobada,
            aprobado_por: this.usuarioId(),
            fecha_aprobacion: new Date().toISOString()
          })
          .eq('id', producto.id);

        if (updateError) {
          console.error('Error actualizando producto limpieza:', updateError);
          errores.push(`Error en ${producto.producto_nombre}`);
        }
      }

      // 2. Actualizar inventario - agregar productos recuperados
      for (const producto of kit.productos) {
        if (producto.cantidad_aprobada > 0) {
          
          // Buscar si existe inventario para este producto
          const { data: inventarioExistente, error: searchError } = await supabase
            .from('inventario')
            .select('id, cantidad')
            .eq('producto_id', producto.producto_id)
            .eq('estado', 'disponible')
            .maybeSingle();

          if (searchError) {
            console.error('Error buscando inventario:', searchError);
            errores.push(`Error buscando inventario para ${producto.producto_nombre}`);
            continue;
          }

          if (inventarioExistente) {
            // Actualizar cantidad existente
            const { error: updateInvError } = await supabase
              .from('inventario')
              .update({
                cantidad: inventarioExistente.cantidad + producto.cantidad_aprobada,
                updated_at: new Date().toISOString()
              })
              .eq('id', inventarioExistente.id);

            if (updateInvError) {
              console.error('Error actualizando inventario:', updateInvError);
              errores.push(`Error actualizando inventario de ${producto.producto_nombre}`);
            }
          } else {
            // Crear nuevo registro de inventario
            const { error: insertInvError } = await supabase
              .from('inventario')
              .insert({
                producto_id: producto.producto_id,
                cantidad: producto.cantidad_aprobada,
                ubicacion: 'BODEGA_PRINCIPAL',
                estado: 'disponible',
                fecha_vencimiento: null
              });

            if (insertInvError) {
              console.error('Error creando inventario:', insertInvError);
              errores.push(`Error creando inventario para ${producto.producto_nombre}`);
            }
          }

          // Registrar movimiento de inventario
          const { error: movError } = await supabase
            .from('movimientos_inventario')
            .insert({
              producto_id: producto.producto_id,
              tipo: 'entrada',
              cantidad: producto.cantidad_aprobada,
              motivo: `Recuperación de kit ${kit.numero_kit} - Limpieza aprobada`,
              usuario_id: this.usuarioId(),
              fecha: new Date().toISOString()
            });

          if (movError) {
            console.error('Error registrando movimiento:', movError);
          }
        }
      }

      // 3. Actualizar kit a estado 'finalizado'
      const { error: kitError } = await supabase
        .from('kits_cirugia')
        .update({
          estado: 'finalizado',
          fecha_fin_limpieza: new Date().toISOString(),
          limpieza_aprobada_por: this.usuarioId(),
          fecha_aprobacion_limpieza: new Date().toISOString()
        })
        .eq('id', kit.id);

      if (kitError) {
        console.error('Error finalizando kit:', kitError);
        errores.push('Error al finalizar el kit');
      }

      // 4. Registrar en trazabilidad
      const { error: trazError } = await supabase
        .from('cirugia_trazabilidad')
        .insert({
          cirugia_id: kit.cirugia_id,
          accion: 'limpieza_aprobada_kit_finalizado',
          descripcion: `Kit ${kit.numero_kit} finalizado. ${kit.productos.length} productos aprobados, ${totalAprobado} unidades recuperadas e ingresadas al inventario.`,
          realizado_por: this.usuarioId(),
          metadata: {
            kit_id: kit.id,
            total_productos: kit.productos.length,
            cantidad_recuperada: totalAprobado,
            productos: kit.productos.map(p => ({
              nombre: p.producto_nombre,
              codigo: p.producto_codigo,
              cantidad_aprobada: p.cantidad_aprobada
            }))
          }
        });

      if (trazError) {
        console.error('Error en trazabilidad:', trazError);
      }

      if (errores.length > 0) {
        alert(
          '⚠️ Kit procesado con algunos errores:\n\n' +
          errores.join('\n') +
          '\n\nRevise los logs para más detalles.'
        );
      } else {
        alert(
          '✅ Kit finalizado exitosamente\n\n' +
          `Kit ${kit.numero_kit} ha sido marcado como FINALIZADO.\n` +
          `${totalAprobado} productos han sido recuperados y agregados al inventario.\n\n` +
          'El ciclo de vida del kit está completo.'
        );
      }

      // Cerrar modal y recargar datos
      this.cerrarDetalle();
      await this.cargarDatos();

    } catch (err: any) {
      console.error('Error al aprobar kit:', err);
      this.error.set(err.message || 'Error al aprobar el kit');
      alert('❌ Error al procesar la aprobación');
    } finally {
      this.procesando.set(false);
    }
  }

  regresar() {
    this.router.navigate(['/internal']);
  }
}
