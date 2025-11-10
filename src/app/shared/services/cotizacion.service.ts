import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from '../data-access/supabase.service';
import { NotificationService } from './notification.service';
import {
  Cotizacion,
  CotizacionItem,
  CotizacionHistorial,
  CreateCotizacionDTO,
  UpdateCotizacionDTO,
  CambiarEstadoCotizacionDTO,
  ConvertirACirugiaDTO,
  CotizacionStats,
  CotizacionFilters,
  CotizacionEstado
} from '../models/cotizacion.model';
import { NotificationType } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class CotizacionService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  /**
   * Obtener todas las cotizaciones con filtros opcionales
   */
  getCotizaciones(filters?: CotizacionFilters): Observable<Cotizacion[]> {
    return from(
      (async () => {
        try {
          let query = this.supabase.client
            .from('cotizaciones')
            .select(`
              *,
              cliente:clientes(nombre, apellido, email, telefono, ciudad),
              tipo_cirugia:tipos_cirugia(nombre, descripcion),
              hospital:hospitales(nombre, ciudad),
              items:cotizacion_items(
                *,
                producto:productos(codigo, nombre, categoria)
              )
            `)
            .order('created_at', { ascending: false });

          // Aplicar filtros
          if (filters?.estado) {
            query = query.eq('estado', filters.estado);
          }
          if (filters?.cliente_id) {
            query = query.eq('cliente_id', filters.cliente_id);
          }
          if (filters?.created_by) {
            query = query.eq('created_by', filters.created_by);
          }
          if (filters?.fecha_inicio) {
            query = query.gte('fecha_emision', filters.fecha_inicio);
          }
          if (filters?.fecha_fin) {
            query = query.lte('fecha_emision', filters.fecha_fin);
          }
          if (filters?.search) {
            query = query.or(`numero_cotizacion.ilike.%${filters.search}%`);
          }

          const { data, error } = await query;

          if (error) {
            console.error('❌ Error obteniendo cotizaciones:', error);
            throw error;
          }

          return data || [];
        } catch (error) {
          console.error('❌ Error en getCotizaciones:', error);
          return [];
        }
      })()
    ).pipe(
      catchError(error => {
        console.error('❌ Error final en getCotizaciones:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener cotizaciones próximas a vencer (< 3 días)
   */
  getCotizacionesProximasAVencer(): Observable<Cotizacion[]> {
    return from(
      (async () => {
        const hoy = new Date();
        const tresDiasDespues = new Date();
        tresDiasDespues.setDate(hoy.getDate() + 3);

        const { data, error } = await this.supabase.client
          .from('cotizaciones')
          .select(`
            *,
            cliente:clientes(nombre, apellido, email, telefono),
            comercial:profiles!cotizaciones_created_by_fkey(full_name, email)
          `)
          .eq('estado', 'enviada')
          .gte('fecha_vencimiento', hoy.toISOString().split('T')[0])
          .lte('fecha_vencimiento', tresDiasDespues.toISOString().split('T')[0])
          .order('fecha_vencimiento', { ascending: true });

        if (error) throw error;
        return data || [];
      })()
    ).pipe(
      catchError(error => {
        console.error('Error obteniendo cotizaciones próximas a vencer:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener una cotización por ID con todos sus detalles
   */
  getCotizacionById(id: string): Observable<Cotizacion | null> {
    return from(
      (async () => {
        try {
          // Primero intentamos obtener la cotización básica
          const { data, error } = await this.supabase.client
            .from('cotizaciones')
            .select(`
              *,
              cliente:clientes(nombre, apellido, email, telefono, ciudad, documento_numero),
              tipo_cirugia:tipos_cirugia(nombre, descripcion, duracion_promedio),
              hospital:hospitales(nombre, ciudad, direccion, telefono),
              items:cotizacion_items(
                *,
                producto:productos(codigo, nombre, categoria, precio)
              )
            `)
            .eq('id', id)
            .single();

          if (error) {
            console.error('❌ Error obteniendo cotización:', error);
            throw error;
          }

          // Si la cotización tiene created_by, intentamos obtener el usuario
          if (data && data.created_by) {
            const { data: comercial } = await this.supabase.client
              .from('profiles')
              .select('full_name, email, phone')
              .eq('id', data.created_by)
              .single();
            
            if (comercial) {
              (data as any).comercial = comercial;
            }
          }

          return data;
        } catch (error) {
          console.error('❌ Error en getCotizacionById:', error);
          return null;
        }
      })()
    ).pipe(
      catchError(error => {
        console.error('❌ Error final en getCotizacionById:', error);
        return of(null);
      })
    );
  }

  /**
   * Alias para getCotizacionById (para compatibilidad con componentes)
   */
  getById(id: string): Observable<Cotizacion | null> {
    return this.getCotizacionById(id);
  }

  /**
   * Eliminar una cotización (solo si está en estado borrador)
   */
  delete(id: string): Observable<{ exito: boolean; mensaje?: string }> {
    return from(
      (async () => {
        try {
          const session = await this.supabase.getSession();
          if (!session?.user?.id) {
            return { exito: false, mensaje: 'Usuario no autenticado' };
          }

          // Verificar que la cotización existe y está en borrador
          const { data: cotizacion, error: fetchError } = await this.supabase.client
            .from('cotizaciones')
            .select('estado, numero_cotizacion')
            .eq('id', id)
            .single();

          if (fetchError || !cotizacion) {
            return { exito: false, mensaje: 'Cotización no encontrada' };
          }

          if (cotizacion.estado !== 'borrador') {
            return { exito: false, mensaje: 'Solo se pueden eliminar cotizaciones en estado borrador' };
          }

          // Eliminar items primero (cascade debería hacerlo, pero por si acaso)
          await this.supabase.client
            .from('cotizacion_items')
            .delete()
            .eq('cotizacion_id', id);

          // Eliminar historial
          await this.supabase.client
            .from('cotizacion_historial')
            .delete()
            .eq('cotizacion_id', id);

          // Eliminar cotización
          const { error: deleteError } = await this.supabase.client
            .from('cotizaciones')
            .delete()
            .eq('id', id);

          if (deleteError) {
            console.error('Error eliminando cotización:', deleteError);
            return { exito: false, mensaje: 'Error al eliminar la cotización' };
          }

          return { exito: true, mensaje: 'Cotización eliminada exitosamente' };

        } catch (error) {
          console.error('Error en delete:', error);
          return { exito: false, mensaje: 'Error inesperado al eliminar la cotización' };
        }
      })()
    );
  }

  /**
   * Crear una nueva cotización
   */
  async createCotizacion(dto: CreateCotizacionDTO): Promise<{ exito: boolean; cotizacion?: Cotizacion; mensaje?: string }> {
    try {
      const session = await this.supabase.getSession();
      if (!session?.user?.id) {
        return { exito: false, mensaje: 'Usuario no autenticado' };
      }

      // 1. Crear la cotización principal
      const { data: cotizacion, error: cotizacionError } = await this.supabase.client
        .from('cotizaciones')
        .insert({
          cliente_id: dto.cliente_id,
          tipo_cirugia_id: dto.tipo_cirugia_id,
          hospital_id: dto.hospital_id,
          medico_cirujano: dto.medico_cirujano,
          fecha_programada: dto.fecha_programada,
          fecha_vencimiento: dto.fecha_vencimiento,
          costo_transporte: dto.costo_transporte || 0,
          descuento: dto.descuento || 0,
          porcentaje_descuento: dto.porcentaje_descuento || 0,
          observaciones: dto.observaciones,
          terminos_condiciones: dto.terminos_condiciones,
          notas_internas: dto.notas_internas,
          created_by: session.user.id,
          estado: 'borrador'
        })
        .select()
        .single();

      if (cotizacionError) {
        console.error('Error creando cotización:', cotizacionError);
        return { exito: false, mensaje: 'Error al crear la cotización' };
      }

      // 2. Crear los items
      if (dto.items && dto.items.length > 0) {
        const items = dto.items.map((item, index) => ({
          cotizacion_id: cotizacion.id,
          producto_id: item.producto_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          precio_total: item.cantidad * item.precio_unitario,
          observaciones: item.observaciones,
          orden: item.orden ?? index
        }));

        const { error: itemsError } = await this.supabase.client
          .from('cotizacion_items')
          .insert(items);

        if (itemsError) {
          console.error('Error creando items:', itemsError);
          // Rollback: eliminar la cotización
          await this.supabase.client
            .from('cotizaciones')
            .delete()
            .eq('id', cotizacion.id);
          return { exito: false, mensaje: 'Error al crear los items de la cotización' };
        }
      }

      // 3. Registrar en historial
      await this.supabase.client
        .from('cotizacion_historial')
        .insert({
          cotizacion_id: cotizacion.id,
          estado_nuevo: 'borrador',
          usuario_id: session.user.id,
          comentario: 'Cotización creada'
        });

      return {
        exito: true,
        cotizacion,
        mensaje: `Cotización ${cotizacion.numero_cotizacion} creada exitosamente`
      };

    } catch (error) {
      console.error('Error en createCotizacion:', error);
      return { exito: false, mensaje: 'Error inesperado al crear la cotización' };
    }
  }

  /**
   * Actualizar una cotización existente
   */
  async updateCotizacion(id: string, dto: UpdateCotizacionDTO): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      // 1. Actualizar la cotización principal
      const updateData: any = {};
      if (dto.cliente_id !== undefined) updateData.cliente_id = dto.cliente_id;
      if (dto.tipo_cirugia_id !== undefined) updateData.tipo_cirugia_id = dto.tipo_cirugia_id;
      if (dto.hospital_id !== undefined) updateData.hospital_id = dto.hospital_id;
      if (dto.medico_cirujano !== undefined) updateData.medico_cirujano = dto.medico_cirujano;
      if (dto.fecha_programada !== undefined) updateData.fecha_programada = dto.fecha_programada;
      if (dto.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = dto.fecha_vencimiento;
      if (dto.costo_transporte !== undefined) updateData.costo_transporte = dto.costo_transporte;
      if (dto.descuento !== undefined) updateData.descuento = dto.descuento;
      if (dto.porcentaje_descuento !== undefined) updateData.porcentaje_descuento = dto.porcentaje_descuento;
      if (dto.observaciones !== undefined) updateData.observaciones = dto.observaciones;
      if (dto.terminos_condiciones !== undefined) updateData.terminos_condiciones = dto.terminos_condiciones;
      if (dto.notas_internas !== undefined) updateData.notas_internas = dto.notas_internas;

      const { error: updateError } = await this.supabase.client
        .from('cotizaciones')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error actualizando cotización:', updateError);
        return { exito: false, mensaje: 'Error al actualizar la cotización' };
      }

      // 2. Si se proporcionan items, reemplazarlos
      if (dto.items) {
        // Eliminar items existentes
        await this.supabase.client
          .from('cotizacion_items')
          .delete()
          .eq('cotizacion_id', id);

        // Crear nuevos items
        if (dto.items.length > 0) {
          const items = dto.items.map((item, index) => ({
            cotizacion_id: id,
            producto_id: item.producto_id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            precio_total: item.cantidad * item.precio_unitario,
            observaciones: item.observaciones,
            orden: item.orden ?? index
          }));

          const { error: itemsError } = await this.supabase.client
            .from('cotizacion_items')
            .insert(items);

          if (itemsError) {
            console.error('Error actualizando items:', itemsError);
            return { exito: false, mensaje: 'Error al actualizar los items' };
          }
        }
      }

      return { exito: true, mensaje: 'Cotización actualizada exitosamente' };

    } catch (error) {
      console.error('Error en updateCotizacion:', error);
      return { exito: false, mensaje: 'Error inesperado al actualizar la cotización' };
    }
  }

  /**
   * Cambiar el estado de una cotización
   * Acepta un DTO completo o un estado simple con comentario opcional
   */
  async cambiarEstado(
    id: string, 
    estadoOrDto: CotizacionEstado | CambiarEstadoCotizacionDTO,
    comentario?: string
  ): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      const session = await this.supabase.getSession();
      if (!session?.user?.id) {
        return { exito: false, mensaje: 'Usuario no autenticado' };
      }

      // Normalizar el parámetro a DTO
      let dto: CambiarEstadoCotizacionDTO;
      if (typeof estadoOrDto === 'string') {
        dto = {
          estado: estadoOrDto,
          comentario: comentario || `Estado cambiado a ${estadoOrDto}`
        };
      } else {
        dto = estadoOrDto;
      }

      // Obtener cotización actual
      const { data: cotizacion, error: fetchError } = await this.supabase.client
        .from('cotizaciones')
        .select(`
          *,
          cliente:clientes(nombre, apellido, email),
          comercial:profiles!cotizaciones_created_by_fkey(full_name, email)
        `)
        .eq('id', id)
        .single();

      if (fetchError || !cotizacion) {
        return { exito: false, mensaje: 'Cotización no encontrada' };
      }

      const estadoAnterior = cotizacion.estado;

      // Actualizar estado
      const updateData: any = { estado: dto.estado };
      
      if (dto.estado === 'rechazada') {
        updateData.motivo_rechazo = dto.motivo_rechazo;
        updateData.fecha_rechazo = new Date().toISOString();
      } else if (dto.estado === 'aprobada') {
        updateData.fecha_aprobacion = new Date().toISOString();
        updateData.aprobada_por = session.user.id;
      }

      const { error: updateError } = await this.supabase.client
        .from('cotizaciones')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error actualizando estado:', updateError);
        return { exito: false, mensaje: 'Error al cambiar el estado' };
      }

      // Registrar en historial
      await this.supabase.client
        .from('cotizacion_historial')
        .insert({
          cotizacion_id: id,
          estado_anterior: estadoAnterior,
          estado_nuevo: dto.estado,
          usuario_id: session.user.id,
          comentario: dto.comentario
        });

      // 📢 Enviar notificaciones según el estado
      await this.enviarNotificacionCambioEstado(cotizacion, estadoAnterior, dto.estado);

      return { exito: true, mensaje: `Estado cambiado a ${dto.estado}` };

    } catch (error) {
      console.error('Error en cambiarEstado:', error);
      return { exito: false, mensaje: 'Error inesperado al cambiar el estado' };
    }
  }

  /**
   * Convertir cotización aprobada en cirugía
   */
  async convertirACirugia(cotizacionId: string, dto: ConvertirACirugiaDTO): Promise<{ exito: boolean; cirugia?: any; mensaje?: string }> {
    try {
      const session = await this.supabase.getSession();
      if (!session?.user?.id) {
        return { exito: false, mensaje: 'Usuario no autenticado' };
      }

      // 1. Obtener cotización
      const { data: cotizacion, error: fetchError } = await this.supabase.client
        .from('cotizaciones')
        .select('*, cliente:clientes(*)')
        .eq('id', cotizacionId)
        .single();

      if (fetchError || !cotizacion) {
        return { exito: false, mensaje: 'Cotización no encontrada' };
      }

      if (cotizacion.estado !== 'aprobada') {
        return { exito: false, mensaje: 'Solo se pueden convertir cotizaciones aprobadas' };
      }

      if (cotizacion.convertida_a_cirugia) {
        return { exito: false, mensaje: 'Esta cotización ya fue convertida en cirugía' };
      }

      // 2. Crear la cirugía
      const { data: cirugia, error: cirugiaError } = await this.supabase.client
        .from('cirugias')
        .insert({
          cliente_id: cotizacion.cliente_id,
          tipo_cirugia_id: cotizacion.tipo_cirugia_id,
          hospital_id: cotizacion.hospital_id,
          medico_cirujano: dto.medico_cirujano,
          fecha_programada: dto.fecha_programada,
          hora_inicio: dto.hora_inicio,
          tecnico_asignado_id: dto.tecnico_asignado_id,
          prioridad: dto.prioridad || 'normal',
          notas: dto.notas || `Creada desde cotización ${cotizacion.numero_cotizacion}`,
          usuario_creador_id: session.user.id,
          estado: 'programada'
        })
        .select()
        .single();

      if (cirugiaError) {
        console.error('Error creando cirugía:', cirugiaError);
        return { exito: false, mensaje: 'Error al crear la cirugía' };
      }

      // 3. Marcar cotización como convertida
      await this.supabase.client
        .from('cotizaciones')
        .update({
          convertida_a_cirugia: true,
          cirugia_id: cirugia.id
        })
        .eq('id', cotizacionId);

      // 4. Registrar en historial
      await this.supabase.client
        .from('cotizacion_historial')
        .insert({
          cotizacion_id: cotizacionId,
          estado_anterior: 'aprobada',
          estado_nuevo: 'aprobada',
          usuario_id: session.user.id,
          comentario: `Convertida en cirugía ${cirugia.numero_cirugia}`
        });

      // 5. 📢 Notificar creación de cirugía desde cotización
      await this.notificarCirugiaCreada(cotizacion, cirugia);

      return {
        exito: true,
        cirugia,
        mensaje: `Cirugía ${cirugia.numero_cirugia} creada exitosamente`
      };

    } catch (error) {
      console.error('Error en convertirACirugia:', error);
      return { exito: false, mensaje: 'Error inesperado al convertir la cotización' };
    }
  }

  /**
   * Eliminar una cotización (solo si está en borrador)
   */
  async deleteCotizacion(id: string): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      // Verificar estado
      const { data: cotizacion, error: fetchError } = await this.supabase.client
        .from('cotizaciones')
        .select('estado, numero_cotizacion')
        .eq('id', id)
        .single();

      if (fetchError || !cotizacion) {
        return { exito: false, mensaje: 'Cotización no encontrada' };
      }

      if (cotizacion.estado !== 'borrador') {
        return { exito: false, mensaje: 'Solo se pueden eliminar cotizaciones en borrador' };
      }

      // Eliminar (los items se eliminan en cascada)
      const { error: deleteError } = await this.supabase.client
        .from('cotizaciones')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error eliminando cotización:', deleteError);
        return { exito: false, mensaje: 'Error al eliminar la cotización' };
      }

      return { exito: true, mensaje: 'Cotización eliminada exitosamente' };

    } catch (error) {
      console.error('Error en deleteCotizacion:', error);
      return { exito: false, mensaje: 'Error inesperado al eliminar la cotización' };
    }
  }

  /**
   * Obtener estadísticas de cotizaciones
   */
  getEstadisticas(comercialId?: string): Observable<CotizacionStats> {
    return from(
      (async () => {
        let query = this.supabase.client
          .from('cotizaciones')
          .select('estado, total');

        if (comercialId) {
          query = query.eq('created_by', comercialId);
        }

        const { data, error } = await query;

        if (error) throw error;

        const stats: CotizacionStats = {
          total: data.length,
          borradores: data.filter(c => c.estado === 'borrador').length,
          enviadas: data.filter(c => c.estado === 'enviada').length,
          aprobadas: data.filter(c => c.estado === 'aprobada').length,
          rechazadas: data.filter(c => c.estado === 'rechazada').length,
          vencidas: data.filter(c => c.estado === 'vencida').length,
          canceladas: data.filter(c => c.estado === 'cancelada').length,
          valor_total_aprobadas: data
            .filter(c => c.estado === 'aprobada')
            .reduce((sum, c) => sum + Number(c.total || 0), 0),
          valor_total_enviadas: data
            .filter(c => c.estado === 'enviada')
            .reduce((sum, c) => sum + Number(c.total || 0), 0),
          tasa_conversion: 0
        };

        // Calcular tasa de conversión
        if (stats.enviadas > 0) {
          stats.tasa_conversion = (stats.aprobadas / stats.enviadas) * 100;
        }

        return stats;
      })()
    ).pipe(
      catchError(error => {
        console.error('Error obteniendo estadísticas:', error);
        return of({
          total: 0,
          borradores: 0,
          enviadas: 0,
          aprobadas: 0,
          rechazadas: 0,
          vencidas: 0,
          canceladas: 0,
          valor_total_aprobadas: 0,
          valor_total_enviadas: 0,
          tasa_conversion: 0
        });
      })
    );
  }

  /**
   * Obtener historial de cambios de una cotización
   */
  getHistorial(cotizacionId: string): Observable<CotizacionHistorial[]> {
    return from(
      this.supabase.client
        .from('cotizacion_historial')
        .select(`
          *,
          usuario:profiles(full_name, email)
        `)
        .eq('cotizacion_id', cotizacionId)
        .order('timestamp', { ascending: false })
    ).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error obteniendo historial:', error);
        return of([]);
      })
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS - NOTIFICACIONES
  // ═══════════════════════════════════════════════════════════════════

  private async enviarNotificacionCambioEstado(
    cotizacion: any,
    estadoAnterior: CotizacionEstado,
    estadoNuevo: CotizacionEstado
  ) {
    try {
      const comercialId = cotizacion.created_by;
      
      let mensaje = '';
      let prioridad: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      let tipo: NotificationType = 'sistema'; // Default

      switch (estadoNuevo) {
        case 'enviada':
          tipo = 'sistema'; // Use 'sistema' for sent notifications
          mensaje = `Cotización ${cotizacion.numero_cotizacion} enviada al cliente ${cotizacion.cliente?.nombre} ${cotizacion.cliente?.apellido}`;
          prioridad = 'medium';
          break;
        case 'aprobada':
          tipo = 'cotizacion_aprobada';
          mensaje = `¡Cotización ${cotizacion.numero_cotizacion} APROBADA por ${cotizacion.cliente?.nombre} ${cotizacion.cliente?.apellido}! 🎉`;
          prioridad = 'high';
          break;
        case 'rechazada':
          tipo = 'cotizacion_rechazada';
          mensaje = `Cotización ${cotizacion.numero_cotizacion} rechazada por ${cotizacion.cliente?.nombre} ${cotizacion.cliente?.apellido}`;
          prioridad = 'medium';
          break;
        case 'vencida':
          tipo = 'cotizacion_vencida';
          mensaje = `Cotización ${cotizacion.numero_cotizacion} ha vencido sin respuesta del cliente`;
          prioridad = 'low';
          break;
        default:
          return;
      }

      await this.notificationService.notifyUsers(
        [comercialId],
        tipo,
        `💰 ${estadoNuevo.toUpperCase()}`,
        mensaje,
        prioridad,
        {
          cotizacion_id: cotizacion.id,
          numero_cotizacion: cotizacion.numero_cotizacion,
          estado_anterior: estadoAnterior,
          estado_nuevo: estadoNuevo,
          cliente_nombre: `${cotizacion.cliente?.nombre} ${cotizacion.cliente?.apellido}`,
          total: cotizacion.total
        },
        `/internal/cotizaciones/${cotizacion.id}`
      );

    } catch (error) {
      console.error('Error enviando notificación de cambio de estado:', error);
    }
  }

  private async notificarCirugiaCreada(cotizacion: any, cirugia: any) {
    try {
      // Notificar al comercial
      await this.notificationService.notifyUsers(
        [cotizacion.created_by],
        'nueva_cirugia' as any,
        '🏥 Cirugía Programada',
        `Cirugía ${cirugia.numero_cirugia} creada desde cotización ${cotizacion.numero_cotizacion}`,
        'high',
        {
          cirugia_id: cirugia.id,
          numero_cirugia: cirugia.numero_cirugia,
          cotizacion_id: cotizacion.id
        },
        `/internal/agenda/cirugia/${cirugia.id}`
      );
    } catch (error) {
      console.error('Error notificando cirugía creada:', error);
    }
  }

  /**
   * Verificar y marcar cotizaciones vencidas
   * Este método debe ejecutarse diariamente (cronjob o scheduled function)
   */
  async verificarCotizacionesVencidas(): Promise<void> {
    try {
      const hoy = new Date().toISOString().split('T')[0];

      // Buscar cotizaciones enviadas con fecha de vencimiento pasada
      const { data: vencidas, error } = await this.supabase.client
        .from('cotizaciones')
        .select('*')
        .eq('estado', 'enviada')
        .lt('fecha_vencimiento', hoy);

      if (error) throw error;

      if (vencidas && vencidas.length > 0) {
        // Marcar como vencidas
        for (const cotizacion of vencidas) {
          await this.cambiarEstado(cotizacion.id, {
            estado: 'vencida',
            comentario: 'Cotización vencida automáticamente por sistema'
          });
        }

      }
    } catch (error) {
      console.error('Error verificando cotizaciones vencidas:', error);
    }
  }
}
