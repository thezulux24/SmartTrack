import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../data-access/supabase.service';
import {
  CirugiaTrazabilidad,
  KitTrazabilidad,
  TrazabilidadCompleta,
  CreateCirugiaTrazabilidadRequest,
  CreateKitTrazabilidadRequest,
  TrazabilidadFilters,
  TrazabilidadStats,
  TipoEntidadTrazabilidad
} from '../models/trazabilidad.model';

@Injectable({
  providedIn: 'root'
})
export class TrazabilidadService {
  private supabase = inject(SupabaseService);

  /**
   * Registrar evento de trazabilidad para cirugía
   */
  registrarEventoCirugia(request: CreateCirugiaTrazabilidadRequest): Observable<CirugiaTrazabilidad> {
    return from(this.registrarEventoCirugiaAsync(request));
  }

  private async registrarEventoCirugiaAsync(request: CreateCirugiaTrazabilidadRequest): Promise<CirugiaTrazabilidad> {
    const user = await this.supabase.client.auth.getUser();
    
    const { data, error } = await this.supabase.client
      .from('cirugia_trazabilidad')
      .insert({
        ...request,
        usuario_id: user.data.user?.id
      })
      .select(`
        *,
        usuario:profiles(id, full_name, role, email),
        cirugia:cirugias(id, numero_cirugia, estado)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Registrar evento de trazabilidad para kit
   */
  registrarEventoKit(request: CreateKitTrazabilidadRequest): Observable<KitTrazabilidad> {
    return from(this.registrarEventoKitAsync(request));
  }

  private async registrarEventoKitAsync(request: CreateKitTrazabilidadRequest): Promise<KitTrazabilidad> {
    const user = await this.supabase.client.auth.getUser();
    
    const { data, error } = await this.supabase.client
      .from('kit_trazabilidad')
      .insert({
        ...request,
        usuario_id: user.data.user?.id
      })
      .select(`
        *,
        usuario:profiles(id, full_name, role, email),
        kit:kits_cirugia(id, numero_kit, estado)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Obtener trazabilidad completa de una cirugía
   */
  getTrazabilidadCirugia(cirugiaId: string): Observable<CirugiaTrazabilidad[]> {
    return from(
      this.supabase.client
        .from('cirugia_trazabilidad')
        .select(`
          *,
          usuario:profiles(id, full_name, role, email),
          cirugia:cirugias(id, numero_cirugia, estado)
        `)
        .eq('cirugia_id', cirugiaId)
        .order('timestamp', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Obtener trazabilidad completa de un kit
   */
  getTrazabilidadKit(kitId: string): Observable<KitTrazabilidad[]> {
    return from(
      this.supabase.client
        .from('kit_trazabilidad')
        .select(`
          *,
          usuario:profiles(id, full_name, role, email),
          kit:kits_cirugia(id, numero_kit, estado)
        `)
        .eq('kit_id', kitId)
        .order('timestamp', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Obtener trazabilidad unificada (cirugías + kits)
   */
  getTrazabilidadCompleta(filters?: TrazabilidadFilters): Observable<TrazabilidadCompleta[]> {
    return from(this.getTrazabilidadCompletaAsync(filters));
  }

  private async getTrazabilidadCompletaAsync(filters?: TrazabilidadFilters): Promise<TrazabilidadCompleta[]> {
    let query = this.supabase.client
      .from('trazabilidad_completa')
      .select('*');

    // Aplicar filtros
    if (filters?.tipo_entidad) {
      query = query.eq('tipo_entidad', filters.tipo_entidad);
    }
    if (filters?.referencia_id) {
      query = query.eq('referencia_id', filters.referencia_id);
    }
    if (filters?.usuario_id) {
      query = query.eq('usuario_id', filters.usuario_id);
    }
    if (filters?.accion) {
      query = query.eq('accion', filters.accion);
    }
    if (filters?.fecha_desde) {
      query = query.gte('timestamp', filters.fecha_desde);
    }
    if (filters?.fecha_hasta) {
      query = query.lte('timestamp', filters.fecha_hasta);
    }

    query = query.order('timestamp', { ascending: false }).limit(100);

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Obtener estadísticas de trazabilidad
   */
  getEstadisticas(filters?: TrazabilidadFilters): Observable<TrazabilidadStats> {
    return from(this.getEstadisticasAsync(filters));
  }

  private async getEstadisticasAsync(filters?: TrazabilidadFilters): Promise<TrazabilidadStats> {
    const eventos = await this.getTrazabilidadCompletaAsync(filters);

    const stats: TrazabilidadStats = {
      total_eventos: eventos.length,
      eventos_por_tipo: {
        cirugia: eventos.filter(e => e.tipo_entidad === 'cirugia').length,
        kit: eventos.filter(e => e.tipo_entidad === 'kit').length
      },
      eventos_por_accion: {},
      ultimos_eventos: eventos.slice(0, 10)
    };

    // Contar eventos por acción
    eventos.forEach(evento => {
      stats.eventos_por_accion[evento.accion] = (stats.eventos_por_accion[evento.accion] || 0) + 1;
    });

    return stats;
  }

  /**
   * Obtener último evento de una entidad
   */
  getUltimoEvento(tipo: TipoEntidadTrazabilidad, referenciaId: string): Observable<TrazabilidadCompleta | null> {
    return from(
      this.supabase.client
        .from('trazabilidad_completa')
        .select('*')
        .eq('tipo_entidad', tipo)
        .eq('referencia_id', referenciaId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      })
    );
  }

  /**
   * Buscar eventos por rango de fechas
   */
  buscarPorFechas(fechaDesde: string, fechaHasta: string, tipo?: TipoEntidadTrazabilidad): Observable<TrazabilidadCompleta[]> {
    return this.getTrazabilidadCompleta({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      tipo_entidad: tipo
    });
  }

  /**
   * Obtener timeline de una cirugía (cirugía + sus kits)
   */
  getTimelineCirugia(cirugiaId: string): Observable<TrazabilidadCompleta[]> {
    return from(this.getTimelineCirugiaAsync(cirugiaId));
  }

  private async getTimelineCirugiaAsync(cirugiaId: string): Promise<TrazabilidadCompleta[]> {
    // Obtener eventos de la cirugía
    const { data: eventosCirugia, error: errorCirugia } = await this.supabase.client
      .from('trazabilidad_completa')
      .select('*')
      .eq('tipo_entidad', 'cirugia')
      .eq('referencia_id', cirugiaId)
      .order('timestamp', { ascending: false });

    if (errorCirugia) throw errorCirugia;

    // Obtener kits de la cirugía
    const { data: kits, error: errorKits } = await this.supabase.client
      .from('kits_cirugia')
      .select('id')
      .eq('cirugia_id', cirugiaId);

    if (errorKits) throw errorKits;

    if (!kits || kits.length === 0) {
      return eventosCirugia || [];
    }

    // Obtener eventos de los kits
    const kitIds = kits.map((k: any) => k.id);
    const { data: eventosKits, error: errorEventosKits } = await this.supabase.client
      .from('trazabilidad_completa')
      .select('*')
      .eq('tipo_entidad', 'kit')
      .in('referencia_id', kitIds)
      .order('timestamp', { ascending: false });

    if (errorEventosKits) throw errorEventosKits;

    // Combinar y ordenar todos los eventos
    const todosEventos = [...(eventosCirugia || []), ...(eventosKits || [])];
    return todosEventos.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
