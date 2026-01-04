import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { 
  HojaGasto, 
  HojaGastoItem, 
  CreateHojaGastoRequest, 
  UpdateHojaGastoRequest, 
  HojaGastoFilters,
  EstadoHojaGasto,
  CategoriaProducto
} from './hoja-gasto.model';

@Injectable({
  providedIn: 'root'
})
export class HojaGastoService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);

  // Obtener todas las hojas de gasto con filtros
  getHojasGasto(filters?: HojaGastoFilters): Observable<HojaGasto[]> {
    return from(this.fetchHojasGasto(filters));
  }

  // Obtener una hoja de gasto específica
  getHojaGasto(id: string): Observable<HojaGasto | null> {
    return from(this.fetchHojaGasto(id) as Promise<HojaGasto | null>);
  }

  // Crear nueva hoja de gasto
  createHojaGasto(request: CreateHojaGastoRequest): Observable<HojaGasto> {
    return from(this.insertHojaGasto(request) as Promise<HojaGasto>);
  }

  // Actualizar hoja de gasto existente
  updateHojaGasto(id: string, request: UpdateHojaGastoRequest): Observable<HojaGasto> {
    return from(this.updateHojaGastoData(id, request) as Promise<HojaGasto>);
  }

  // Cambiar estado de hoja de gasto
  cambiarEstado(id: string, nuevoEstado: EstadoHojaGasto): Observable<HojaGasto> {
    return from(this.updateEstado(id, nuevoEstado));
  }

  // Eliminar hoja de gasto
  deleteHojaGasto(id: string): Observable<boolean> {
    return from(this.removeHojaGasto(id));
  }

  // Verificar si existe una hoja de gasto para una cirugía
  existeHojaGastoPorCirugia(cirugiaId: string): Observable<boolean> {
    return from(
      this.supabase.client
        .from('hojas_gasto')
        .select('id')
        .eq('cirugia_id', cirugiaId)
        .limit(1)
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error verificando hoja de gasto existente:', error);
          return false;
        }
        return data !== null && data.length > 0;
      })
    );
  }

  // Obtener hoja de gasto por cirugía ID
  getHojaGastoPorCirugia(cirugiaId: string): Observable<HojaGasto | null> {
    return from(
      this.supabase.client
        .from('hojas_gasto')
        .select(`
          *,
          hoja_gasto_items(*)
        `)
        .eq('cirugia_id', cirugiaId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          if (error.code === 'PGRST116') {
            return null; // No encontrado
          }
          console.error('Error obteniendo hoja de gasto por cirugía:', error);
          throw error;
        }
        return this.mapToHojaGasto(data);
      }),
      catchError(error => {
        console.error('Error in getHojaGastoPorCirugia:', error);
        return of(null);
      })
    );
  }

  // Recalcular totales
  recalcularTotales(hojaGasto: HojaGasto): HojaGasto {
    const totales = {
      total_productos: 0,
      total_transporte: 0,
      total_otros: 0,
      total_general: 0
    };

    const items = hojaGasto.items || hojaGasto.hoja_gasto_items || [];
    items.forEach(item => {
      const subtotal = item.subtotal || item.precio_total || (item.cantidad * item.precio_unitario);
      totales.total_general += subtotal;

      switch (item.categoria) {
        case 'productos':
          totales.total_productos += subtotal;
          break;
        case 'transporte':
          totales.total_transporte += subtotal;
          break;
        case 'otros':
          totales.total_otros += subtotal;
          break;
      }
    });

    return {
      ...hojaGasto,
      ...totales
    };
  }

  // === Métodos privados para interacción con Supabase ===

  private async fetchHojasGasto(filters?: HojaGastoFilters): Promise<HojaGasto[]> {
    try {
      let query = this.supabase.client
        .from('hojas_gasto')
        .select(`
          *,
          hoja_gasto_items(*),
          tecnico:profiles!hojas_gasto_tecnico_id_fkey(id, full_name, email),
          cirugia:cirugias!hojas_gasto_cirugia_id_fkey(
            id,
            numero_cirugia,
            medico_cirujano,
            fecha_programada,
            cliente:clientes(nombre, apellido),
            hospital:hospitales(nombre)
          )
        `);

      // Aplicar filtros
      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }
      if (filters?.fecha_desde) {
        query = query.gte('fecha_cirugia', filters.fecha_desde);
      }
      if (filters?.fecha_hasta) {
        query = query.lte('fecha_cirugia', filters.fecha_hasta);
      }
      if (filters?.tecnico_id) {
        query = query.eq('tecnico_id', filters.tecnico_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching hojas gasto:', error);
        throw error;
      }

      return this.mapToHojasGasto(data || []);
    } catch (error) {
      console.error('Error in fetchHojasGasto:', error);
      throw error;
    }
  }

  private async fetchHojaGasto(id: string): Promise<HojaGasto | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('hojas_gasto')
        .select(`
          *,
          hoja_gasto_items(*),
          tecnico:profiles!hojas_gasto_tecnico_id_fkey(id, full_name, email),
          cirugia:cirugias!hojas_gasto_cirugia_id_fkey(
            id,
            numero_cirugia,
            medico_cirujano,
            fecha_programada,
            cliente:clientes(nombre, apellido),
            hospital:hospitales(nombre)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No encontrado
        }
        console.error('Error fetching hoja gasto:', error);
        throw error;
      }

      return this.mapToHojaGasto(data);
    } catch (error) {
      console.error('Error in fetchHojaGasto:', error);
      throw error;
    }
  }

  private async insertHojaGasto(request: CreateHojaGastoRequest): Promise<HojaGasto> {
    try {

      // VALIDAR: Verificar que no exista ya una hoja de gasto para esta cirugía
      const { data: existingHoja, error: checkError } = await this.supabase.client
        .from('hojas_gasto')
        .select('id, numero_hoja, estado')
        .eq('cirugia_id', request.cirugia_id)
        .limit(1);

      if (checkError) {
        console.error('❌ Error verificando hoja existente:', checkError);
        throw checkError;
      }

      if (existingHoja && existingHoja.length > 0) {
        const hojaExistente = existingHoja[0];
        console.warn('⚠️ Ya existe una hoja de gasto para esta cirugía:', hojaExistente);
        throw new Error(`Ya existe una hoja de gasto (${hojaExistente.numero_hoja}) para esta cirugía. No se pueden crear hojas duplicadas.`);
      }

      // Generar número de hoja
      const numeroHoja = await this.generateNumeroHoja();

      // Calcular totales
      let total_productos = 0;
      let total_transporte = 0;
      let total_otros = 0;
      let total_general = 0;

      if (request.items && request.items.length > 0) {
        request.items.forEach(item => {
          const cantidad = item.cantidad_usada || item.cantidad || 0;
          const subtotal = cantidad * item.precio_unitario;
          total_general += subtotal;

          switch (item.categoria) {
            case 'productos':
              total_productos += subtotal;
              break;
            case 'transporte':
              total_transporte += subtotal;
              break;
            case 'otros':
              total_otros += subtotal;
              break;
          }
        });
      }


      // Preparar datos para insertar - SIN total_alojamiento
      const hojaGastoData = {
        numero_hoja: numeroHoja,
        cirugia_id: request.cirugia_id,
        tecnico_id: request.tecnico_id,
        fecha_cirugia: request.fecha_cirugia,
        estado: 'borrador',
        total_productos,
        total_transporte,
        total_otros,
        total_general,
        observaciones: request.observaciones || null
      };


      // Insertar hoja de gasto
      const { data: hojaData, error: hojaError } = await this.supabase.client
        .from('hojas_gasto')
        .insert(hojaGastoData)
        .select()
        .single();

      if (hojaError) {
        throw hojaError;
      }

      // Insertar items
      if (request.items && request.items.length > 0) {
        const itemsToInsert = request.items.map(item => ({
          hoja_gasto_id: hojaData.id,
          producto_id: item.producto_id,
          categoria: item.categoria,
          descripcion: item.descripcion || item.nombre_producto || '',
          cantidad: item.cantidad || item.cantidad_usada || 0,
          precio_unitario: item.precio_unitario,
          precio_total: (item.cantidad || item.cantidad_usada || 0) * item.precio_unitario,
          fecha_gasto: item.fecha_gasto,
          comprobante_url: item.comprobante_url,
          observaciones: item.observaciones
        }));

        const { error: itemsError } = await this.supabase.client
          .from('hoja_gasto_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error inserting hoja gasto items:', itemsError);
          // Revertir la hoja de gasto si fallan los items
          await this.supabase.client.from('hojas_gasto').delete().eq('id', hojaData.id);
          throw itemsError;
        }
      }

      // Obtener la hoja completa con items
      return await this.fetchHojaGasto(hojaData.id) as HojaGasto;
    } catch (error) {
      console.error('Error in insertHojaGasto:', error);
      throw error;
    }
  }

  private async updateHojaGastoData(id: string, request: UpdateHojaGastoRequest): Promise<HojaGasto> {
    try {
      // Calcular totales de los nuevos items
      let total_productos = 0;
      let total_transporte = 0;
      let total_otros = 0;
      let total_general = 0;

      if (request.items && request.items.length > 0) {
        request.items.forEach(item => {
          const cantidad = item.cantidad_usada || item.cantidad || 0;
          const subtotal = cantidad * item.precio_unitario;
          total_general += subtotal;

          switch (item.categoria) {
            case 'productos':
              total_productos += subtotal;
              break;
            case 'transporte':
              total_transporte += subtotal;
              break;
            case 'otros':
              total_otros += subtotal;
              break;
          }
        });
      }

      // Actualizar hoja de gasto - SIN total_alojamiento
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (request.estado) {
        updateData.estado = request.estado;
      }
      if (request.observaciones !== undefined) {
        updateData.observaciones = request.observaciones;
      }
      if (request.items && request.items.length > 0) {
        updateData.total_productos = total_productos;
        updateData.total_transporte = total_transporte;
        updateData.total_otros = total_otros;
        updateData.total_general = total_general;
      }



      const { error: hojaError } = await this.supabase.client
        .from('hojas_gasto')
        .update(updateData)
        .eq('id', id);

      if (hojaError) {
        console.error('Error updating hoja gasto:', hojaError);
        throw hojaError;
      }

      // Actualizar items si se proporcionan
      if (request.items && request.items.length > 0) {
        // Eliminar items existentes
        const { error: deleteError } = await this.supabase.client
          .from('hoja_gasto_items')
          .delete()
          .eq('hoja_gasto_id', id);

        if (deleteError) {
          console.error('Error deleting existing items:', deleteError);
          throw deleteError;
        }

        // Insertar nuevos items
        const itemsToInsert = request.items.map(item => ({
          hoja_gasto_id: id,
          producto_id: item.producto_id,
          categoria: item.categoria,
          descripcion: item.descripcion || item.nombre_producto || '',
          cantidad: item.cantidad || item.cantidad_usada || 0,
          precio_unitario: item.precio_unitario,
          precio_total: (item.cantidad || item.cantidad_usada || 0) * item.precio_unitario,
          fecha_gasto: item.fecha_gasto,
          comprobante_url: item.comprobante_url,
          observaciones: item.observaciones
        }));

        const { error: itemsError } = await this.supabase.client
          .from('hoja_gasto_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error inserting updated items:', itemsError);
          throw itemsError;
        }
      }

      // Obtener la hoja actualizada
      return await this.fetchHojaGasto(id) as HojaGasto;
    } catch (error) {
      console.error('Error in updateHojaGastoData:', error);
      throw error;
    }
  }

  private async updateEstado(id: string, nuevoEstado: EstadoHojaGasto): Promise<HojaGasto> {
    try {
      // 1. Obtener datos actuales
      const hojaActual = await this.fetchHojaGasto(id) as HojaGasto;
      if (!hojaActual) throw new Error('Hoja de gasto no encontrada');

      const estadoAnterior = hojaActual.estado;

      // 2. Actualizar estado
      const { error } = await this.supabase.client
        .from('hojas_gasto')
        .update({ 
          estado: nuevoEstado, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating estado:', error);
        throw error;
      }

      // 3. 📢 Obtener usuario actual para notificación
      const { data: userData } = await this.supabase.client.auth.getUser();
      const aprobadorNombre = userData?.user?.email || 'Sistema';

      // 4. 📢 Enviar notificación de cambio de estado
      await this.notificationService.notifyHojaGastoStatusChange(
        id,
        hojaActual.numero_hoja,
        hojaActual.tecnico_id, // Usuario creador (técnico)
        estadoAnterior,
        nuevoEstado,
        aprobadorNombre,
        undefined // Sin comentario por ahora
      ).catch(err => console.error('Error enviando notificación de cambio estado:', err));

      // 5. 📢 Si pasa a 'revision', notificar a aprobadores
      if (nuevoEstado === 'revision' && estadoAnterior !== 'revision') {
        // Obtener cirugía asociada
        const { data: cirugiaData } = await this.supabase.client
          .from('cirugias')
          .select('numero_cirugia')
          .eq('id', hojaActual.cirugia_id)
          .single();

        // Obtener nombre del técnico
        const { data: tecnicoData } = await this.supabase.client
          .from('profiles')
          .select('full_name')
          .eq('id', hojaActual.tecnico_id)
          .single();

        await this.notificationService.notifyHojaGastoNeedsApproval(
          id,
          hojaActual.numero_hoja,
          tecnicoData?.full_name || 'Técnico',
          hojaActual.total_general,
          cirugiaData?.numero_cirugia
        ).catch(err => console.error('Error enviando notificación de aprobación pendiente:', err));
      }

      return await this.fetchHojaGasto(id) as HojaGasto;
    } catch (error) {
      console.error('Error in updateEstado:', error);
      throw error;
    }
  }

  private async removeHojaGasto(id: string): Promise<boolean> {
    try {
      // Eliminar items primero
      await this.supabase.client
        .from('hoja_gasto_items')
        .delete()
        .eq('hoja_gasto_id', id);

      // Eliminar hoja de gasto
      const { error } = await this.supabase.client
        .from('hojas_gasto')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting hoja gasto:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in removeHojaGasto:', error);
      throw error;
    }
  }

  private async generateNumeroHoja(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Obtener el último número del mes
    const { data, error } = await this.supabase.client
      .from('hojas_gasto')
      .select('numero_hoja')
      .like('numero_hoja', `HG-${year}${month}-%`)
      .order('numero_hoja', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].numero_hoja.split('-')[2];
      nextNumber = parseInt(lastNumber) + 1;
    }

    return `HG-${year}${month}-${String(nextNumber).padStart(3, '0')}`;
  }

  // === Métodos de mapeo ===

  private mapToHojasGasto(data: any[]): HojaGasto[] {
    return data.map(item => this.mapToHojaGasto(item));
  }

  private mapToHojaGasto(data: any): HojaGasto {
    return {
      id: data.id,
      numero_hoja: data.numero_hoja,
      cirugia_id: data.cirugia_id,
      tecnico_id: data.tecnico_id,
      fecha_cirugia: data.fecha_cirugia,
      fecha_creacion: data.fecha_creacion || data.created_at,
      estado: data.estado as EstadoHojaGasto,
      total_productos: data.total_productos || 0,
      total_transporte: data.total_transporte || 0,
      total_otros: data.total_otros || 0,
      total_general: data.total_general || 0,
      observaciones: data.observaciones,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      updated_by: data.updated_by,
      // Datos relacionales
      tecnico: data.tecnico ? {
        id: data.tecnico.id,
        full_name: data.tecnico.full_name,
        email: data.tecnico.email
      } : undefined,
      cirugia: data.cirugia ? {
        id: data.cirugia.id,
        numero_cirugia: data.cirugia.numero_cirugia,
        medico_cirujano: data.cirugia.medico_cirujano,
        fecha_programada: data.cirugia.fecha_programada,
        cliente: data.cirugia.cliente ? {
          nombre: data.cirugia.cliente.nombre,
          apellido: data.cirugia.cliente.apellido
        } : undefined,
        hospital: data.cirugia.hospital ? {
          nombre: data.cirugia.hospital.nombre
        } : undefined
      } : undefined,
      items: data.hoja_gasto_items?.map((item: any) => ({
        id: item.id,
        hoja_gasto_id: item.hoja_gasto_id,
        producto_id: item.producto_id,
        categoria: item.categoria as CategoriaProducto,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_total: item.precio_total,
        fecha_gasto: item.fecha_gasto,
        comprobante_url: item.comprobante_url,
        observaciones: item.observaciones,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Alias para compatibilidad
        nombre_producto: item.descripcion,
        cantidad_usada: item.cantidad,
        subtotal: item.precio_total
      })) || [],
      hoja_gasto_items: data.hoja_gasto_items?.map((item: any) => ({
        id: item.id,
        hoja_gasto_id: item.hoja_gasto_id,
        producto_id: item.producto_id,
        categoria: item.categoria as CategoriaProducto,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_total: item.precio_total,
        fecha_gasto: item.fecha_gasto,
        comprobante_url: item.comprobante_url,
        observaciones: item.observaciones,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || []
    };
  }
}