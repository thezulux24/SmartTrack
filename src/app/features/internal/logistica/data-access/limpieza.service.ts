import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of, switchMap, forkJoin } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { 
  KitProductoLimpieza, 
  KitLimpiezaAgrupado, 
  ConfirmarRecepcionRequest,
  ActualizarInventarioRequest,
  EstadoRecepcion 
} from './limpieza.model';

@Injectable({
  providedIn: 'root'
})
export class LimpiezaService {
  private supabase = inject(SupabaseService);

  /**
   * Obtiene todos los kits con productos enviados a limpieza (pendientes de recepción)
   */
  getKitsEnLimpieza(): Observable<KitLimpiezaAgrupado[]> {
    return from(
      this.supabase.client
        .from('kit_productos_limpieza')
        .select(`
          *,
          producto:productos(id, codigo, nombre, categoria),
          kit:kits_cirugia(id, numero_kit, cirugia_id, estado, fecha_inicio_limpieza),
          kit_producto:kit_productos(id, lote, fecha_vencimiento)
        `)
        .eq('estado', 'enviado_limpieza')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching kits en limpieza:', response.error);
          throw new Error(response.error.message);
        }
        return this.agruparPorKit(response.data || []);
      }),
      catchError(error => {
        console.error('Service error:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un kit específico con sus productos en limpieza
   */
  getKitLimpieza(kitId: string): Observable<KitLimpiezaAgrupado | null> {
    return from(
      this.supabase.client
        .from('kit_productos_limpieza')
        .select(`
          *,
          producto:productos(id, codigo, nombre, categoria),
          kit:kits_cirugia(id, numero_kit, cirugia_id, estado, fecha_inicio_limpieza),
          kit_producto:kit_productos(id, lote, fecha_vencimiento)
        `)
        .eq('kit_id', kitId)
        .eq('estado', 'enviado_limpieza')
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching kit limpieza:', response.error);
          return null;
        }
        const agrupados = this.agruparPorKit(response.data || []);
        return agrupados.length > 0 ? agrupados[0] : null;
      }),
      catchError(error => {
        console.error('Service error:', error);
        return of(null);
      })
    );
  }

  /**
   * Confirma la recepción de productos limpios
   */
  confirmarRecepcion(request: ConfirmarRecepcionRequest): Observable<boolean> {
    return from(this.confirmarRecepcionAsync(request)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error confirmando recepción:', error);
        return of(false);
      })
    );
  }

  private async confirmarRecepcionAsync(request: ConfirmarRecepcionRequest): Promise<void> {

    try {
      // 1. Actualizar estado de productos en kit_productos_limpieza
      const { error: updateError } = await this.supabase.client
        .from('kit_productos_limpieza')
        .update({
          estado: 'devuelto_limpio',
          fecha_devuelto_limpio: new Date().toISOString(),
          recibido_por_id: request.recibido_por_id,
          observaciones_recepcion: request.observaciones
        })
        .in('id', request.productos_ids);

      if (updateError) {
        console.error('❌ Error actualizando productos limpieza:', updateError);
        throw new Error('Error al actualizar productos de limpieza');
      }

      // 2. Obtener los productos para actualizar inventario
      const { data: productos, error: fetchError } = await this.supabase.client
        .from('kit_productos_limpieza')
        .select(`
          *,
          kit_producto:kit_productos(lote, fecha_vencimiento, producto_id)
        `)
        .in('id', request.productos_ids);

      if (fetchError || !productos) {
        console.error('❌ Error obteniendo productos:', fetchError);
        throw new Error('Error al obtener productos');
      }

      // 3. Actualizar inventario para cada producto
      for (const producto of productos) {
        await this.actualizarInventario({
          producto_id: producto.producto_id,
          cantidad: producto.cantidad_aprobada || producto.cantidad_a_recuperar,
          kit_id: producto.kit_id,
          usuario_id: request.recibido_por_id,
          lote: producto.kit_producto?.lote,
          fecha_vencimiento: producto.kit_producto?.fecha_vencimiento
        });
      }

      // 4. Actualizar estado final a en_inventario
      const { error: finalUpdateError } = await this.supabase.client
        .from('kit_productos_limpieza')
        .update({
          estado: 'en_inventario'
        })
        .in('id', request.productos_ids);

      if (finalUpdateError) {
        console.error('⚠️ Error actualizando a en_inventario:', finalUpdateError);
        // No lanzamos error aquí porque el inventario ya se actualizó
      }

      // 5. Verificar si todos los productos del kit están en inventario
      const { data: productosRestantes } = await this.supabase.client
        .from('kit_productos_limpieza')
        .select('id')
        .eq('kit_id', request.kit_id)
        .neq('estado', 'en_inventario');

      // 6. Si no hay productos pendientes, actualizar estado del kit a finalizado
      if (!productosRestantes || productosRestantes.length === 0) {
        const { error: kitUpdateError } = await this.supabase.client
          .from('kits_cirugia')
          .update({
            estado: 'finalizado',
            fecha_fin_limpieza: new Date().toISOString(),
            limpieza_aprobada_por: request.recibido_por_id,
            fecha_aprobacion_limpieza: new Date().toISOString()
          })
          .eq('id', request.kit_id);

        if (kitUpdateError) {
          console.error('⚠️ Error actualizando kit:', kitUpdateError);
        }
      }

    } catch (error) {
      console.error('❌ Error fatal en confirmación:', error);
      throw error;
    }
  }

  /**
   * Actualiza el inventario con los productos recuperados
   */
  private async actualizarInventario(request: ActualizarInventarioRequest): Promise<void> {

    try {
      // 1. Buscar registro de inventario existente
      const { data: inventarioExistente, error: fetchError } = await this.supabase.client
        .from('inventario')
        .select('*')
        .eq('producto_id', request.producto_id)
        .eq('ubicacion', 'sede_principal')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error buscando inventario:', fetchError);
        throw fetchError;
      }

      if (inventarioExistente) {
        // Actualizar cantidad existente
        const { error: updateError } = await this.supabase.client
          .from('inventario')
          .update({
            cantidad: inventarioExistente.cantidad + request.cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventarioExistente.id);

        if (updateError) {
          console.error('Error actualizando inventario:', updateError);
          throw updateError;
        }

      } else {
        // Crear nuevo registro
        const { error: insertError } = await this.supabase.client
          .from('inventario')
          .insert({
            producto_id: request.producto_id,
            cantidad: request.cantidad,
            ubicacion: 'sede_principal',
            estado: 'disponible'
          });

        if (insertError) {
          console.error('Error creando inventario:', insertError);
          throw insertError;
        }

      }

      // 2. Crear movimiento de inventario
      const { error: movimientoError } = await this.supabase.client
        .from('movimientos_inventario')
        .insert({
          producto_id: request.producto_id,
          tipo: 'devolucion_limpieza',
          cantidad: request.cantidad,
          motivo: `Devolución desde limpieza - Kit ${request.kit_id}`,
          usuario_id: request.usuario_id,
          ubicacion_destino: 'sede_principal',
          referencia: request.kit_id,
          lote: request.lote,
          fecha_vencimiento: request.fecha_vencimiento
        });

      if (movimientoError) {
        console.error('⚠️ Error creando movimiento:', movimientoError);
        // No lanzamos error porque el inventario ya se actualizó
      }
    } catch (error) {
      console.error('❌ Error actualizando inventario:', error);
      throw error;
    }
  }

  /**
   * Agrupa productos por kit
   */
  private agruparPorKit(productos: any[]): KitLimpiezaAgrupado[] {
    const kitsMap = new Map<string, KitLimpiezaAgrupado>();

    productos.forEach(producto => {
      if (!producto.kit) return;

      const kitId = producto.kit.id;

      if (!kitsMap.has(kitId)) {
        kitsMap.set(kitId, {
          kit_id: kitId,
          numero_kit: producto.kit.numero_kit,
          cirugia_id: producto.kit.cirugia_id,
          fecha_inicio_limpieza: producto.kit.fecha_inicio_limpieza,
          total_productos: 0,
          productos_pendientes: 0,
          productos: []
        });
      }

      const kit = kitsMap.get(kitId)!;
      kit.total_productos++;
      if (producto.estado === 'enviado_limpieza') {
        kit.productos_pendientes++;
      }
      kit.productos.push(producto);
    });

    return Array.from(kitsMap.values());
  }
}
