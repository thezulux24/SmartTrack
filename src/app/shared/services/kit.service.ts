import { Injectable } from '@angular/core';
import { SupabaseService } from '../data-access/supabase.service';
import { 
  KitCirugia, 
  KitProducto, 
  KitTrazabilidad, 
  QrCode, 
  QrEscaneo,
  CreateKitRequest,
  UpdateKitEstadoRequest,
  RegistrarTrazabilidadRequest,
  EstadoKit
} from '../models/kit.model';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KitService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Crear un nuevo kit para una cirugía
   */
  crearKit(request: CreateKitRequest): Observable<KitCirugia> {
    return from(this.crearKitCompleto(request));
  }

  private async crearKitCompleto(request: CreateKitRequest): Promise<KitCirugia> {
    // 1. Crear el kit principal
    const codigoKit = `KIT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    const { data: kit, error: kitError } = await this.supabase.client
      .from('kits_cirugia')
      .insert({
        cirugia_id: request.cirugia_id,
        numero_kit: codigoKit,
        qr_code: `QR-${codigoKit}`,
        estado: 'solicitado',
        comercial_id: (await this.supabase.client.auth.getUser()).data.user?.id,
        observaciones: request.observaciones
      })
      .select()
      .single();

    if (kitError) throw kitError;

    // 2. Agregar productos al kit
    if (request.productos && request.productos.length > 0) {
      const productosKit = request.productos.map(producto => ({
        kit_id: kit.id,
        producto_id: producto.producto_id,
        cantidad_solicitada: producto.cantidad_solicitada,
        cantidad_preparada: 0,
        cantidad_enviada: 0,
        cantidad_utilizada: 0,
        cantidad_devuelta: 0,
        observaciones: producto.observaciones,
        created_at: new Date().toISOString()
      }));

      const { error: productosError } = await this.supabase.client
        .from('kit_productos')
        .insert(productosKit);

      if (productosError) throw productosError;
    }

    // 3. Registrar trazabilidad inicial
    await this.supabase.client
      .from('kit_trazabilidad')
      .insert({
        kit_id: kit.id,
        usuario_id: (await this.supabase.client.auth.getUser()).data.user?.id,
        accion: 'kit_creado',
        estado_nuevo: 'solicitado',
        observaciones: 'Kit solicitado por comercial - Pendiente de aprobación logística'
      });

    // 4. Retornar el kit completo
    const { data: kitCompleto, error: consultaError } = await this.supabase.client
      .from('kits_cirugia')
      .select(`
        *,
        cirugia:cirugias(*),
        comercial:profiles!comercial_id(*),
        productos:kit_productos(
          *,
          producto:productos(*)
        )
      `)
      .eq('id', kit.id)
      .single();

    if (consultaError) throw consultaError;
    return kitCompleto;
  }

  /**
   * Verificar si una cirugía tiene kit
   */
  tieneKit(cirugiaId: string): Observable<boolean> {
    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select('id')
        .eq('cirugia_id', cirugiaId)
        .limit(1)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data && data.length > 0;
      })
    );
  }

  /**
   * Obtener kit por cirugía ID
   */
  getKitPorCirugia(cirugiaId: string): Observable<KitCirugia | null> {
    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*),
          productos:kit_productos(
            *,
            producto:productos(*)
          )
        `)
        .eq('cirugia_id', cirugiaId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
        return data || null;
      })
    );
  }

  /**
   * Obtener kits por estado
   */
  getKitsPorEstado(estado: KitCirugia['estado']): Observable<KitCirugia[]> {
    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(
            *,
            cliente:clientes(*),
            hospital:hospitales(*)
          ),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*),
          productos:kit_productos(
            *,
            producto:productos(
              *,
              inventario:inventario(cantidad, ubicacion, estado)
            )
          )
        `)
        .eq('estado', estado)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Obtener un kit por ID con todas sus relaciones
   */
  getKitById(kitId: string): Observable<KitCirugia> {
    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*),
          productos:kit_productos(
            *,
            producto:productos(*)
          ),
          trazabilidad:kit_trazabilidad(
            *,
            usuario:profiles(*)
          )
        `)
        .eq('id', kitId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    );
  }

  /**
   * Actualizar el estado de un kit
   */
  actualizarEstadoKit(kitId: string, nuevoEstado: EstadoKit, opciones?: {
    observaciones?: string;
    usuario_id?: string;
    ubicacion_actual?: string;
  }): Observable<KitCirugia> {
    const actualizacion: any = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString()
    };

    if (opciones?.observaciones) {
      actualizacion.observaciones = opciones.observaciones;
    }

    if (opciones?.ubicacion_actual) {
      actualizacion.ubicacion_actual = opciones.ubicacion_actual;
    }

    // Actualizar fechas según el estado
    switch (nuevoEstado) {
      case 'preparando':
        actualizacion.fecha_preparacion = new Date().toISOString();
        break;
      case 'listo_envio':
        actualizacion.fecha_preparacion = new Date().toISOString();
        break;
      case 'en_transito':
        actualizacion.fecha_envio = new Date().toISOString();
        break;
      case 'entregado':
      case 'en_uso':
        actualizacion.fecha_recepcion = new Date().toISOString();
        break;
      case 'devuelto':
        actualizacion.fecha_devolucion = new Date().toISOString();
        break;
    }

    // Agregar usuario responsable según el estado
    if (opciones?.usuario_id) {
      switch (nuevoEstado) {
        case 'preparando':
        case 'listo_envio':
          actualizacion.logistica_id = opciones.usuario_id;
          break;
        case 'en_uso':
        case 'entregado':
          actualizacion.tecnico_id = opciones.usuario_id;
          break;
      }
    }

    return from(
      this.supabase.client
        .from('kits_cirugia')
        .update(actualizacion)
        .eq('id', kitId)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        
        // Registrar trazabilidad
        this.supabase.client
          .from('kit_trazabilidad')
          .insert({
            kit_id: kitId,
            usuario_id: opciones?.usuario_id,
            accion: `cambio_estado_${nuevoEstado}`,
            estado_nuevo: nuevoEstado,
            observaciones: opciones?.observaciones || `Estado cambiado a ${nuevoEstado}`
          });
        
        return data;
      })
    );
  }

  /**
   * Obtener productos de un kit
   */
  getProductosKit(kitId: string): Observable<KitProducto[]> {
    return from(
      this.supabase.client
        .from('kit_productos')
        .select(`
          *,
          producto:productos(*)
        `)
        .eq('kit_id', kitId)
        .order('created_at', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Generar código QR para un kit
   */
  generarQrKit(kitId: string): Observable<QrCode> {
    return from(this.generarQrKitDirecto(kitId));
  }

  private async generarQrKitDirecto(kitId: string): Promise<QrCode> {
    const codigoQr = `QR-${kitId}-${Date.now()}`;
    
    const { data: qrCode, error } = await this.supabase.client
      .from('qr_codes')
      .insert({
        codigo: codigoQr,
        tipo: 'kit',
        referencia_id: kitId,
        es_activo: true,
        fecha_generacion: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return qrCode;
  }

  /**
   * Escanear código QR
   */
  escanearQr(codigoQr: string, usuarioId: string): Observable<QrEscaneo> {
    return from(this.escanearQrDirecto(codigoQr, usuarioId));
  }

  private async escanearQrDirecto(codigoQr: string, usuarioId: string): Promise<QrEscaneo> {
    // 1. Verificar que el QR existe y está activo
    const { data: qrCode, error: qrError } = await this.supabase.client
      .from('qr_codes')
      .select('*')
      .eq('codigo', codigoQr)
      .eq('es_activo', true)
      .single();

    if (qrError) throw new Error('Código QR no válido o expirado');

    // 2. Registrar el escaneo
    const { data: escaneo, error: escaneoError } = await this.supabase.client
      .from('qr_escaneos')
      .insert({
        qr_code_id: qrCode.id,
        usuario_id: usuarioId,
        fecha_escaneo: new Date().toISOString(),
        ubicacion: 'Ubicación actual', // Aquí podrías agregar geolocalización
        accion_realizada: 'kit_escaneado'
      })
      .select(`
        *,
        qr_code:qr_codes(*),
        usuario:profiles(*)
      `)
      .single();

    if (escaneoError) throw escaneoError;

    // 3. Actualizar contador de escaneos
    await this.supabase.client
      .from('qr_codes')
      .update({
        veces_escaneado: qrCode.veces_escaneado + 1,
        ultimo_escaneo: new Date().toISOString()
      })
      .eq('id', qrCode.id);

    // 4. Registrar trazabilidad si es un kit
    if (qrCode.tipo === 'kit' && qrCode.referencia_id) {
      await this.supabase.client
        .from('kit_trazabilidad')
        .insert({
          kit_id: qrCode.referencia_id,
          usuario_id: usuarioId,
          accion: 'qr_escaneado',
          estado_nuevo: 'escaneado',
          observaciones: `Código QR escaneado: ${codigoQr}`
        });
    }

    return escaneo;
  }

  /**
   * Registrar trazabilidad de un kit
   */
  registrarTrazabilidad(request: RegistrarTrazabilidadRequest): Observable<KitTrazabilidad> {
    return from(
      this.supabase.client
        .from('kit_trazabilidad')
        .insert({
          kit_id: request.kit_id,
          usuario_id: request.usuario_id,
          accion: request.accion,
          estado_anterior: request.estado_anterior,
          estado_nuevo: request.estado_nuevo,
          ubicacion: request.ubicacion,
          coordenadas_lat: request.coordenadas_lat,
          coordenadas_lng: request.coordenadas_lng,
          observaciones: request.observaciones,
          metadata: request.metadata
        })
        .select(`
          *,
          usuario:profiles(*)
        `)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    );
  }

  /**
   * Obtener trazabilidad de un kit
   */
  getTrazabilidadKit(kitId: string): Observable<KitTrazabilidad[]> {
    return from(
      this.supabase.client
        .from('kit_trazabilidad')
        .select(`
          *,
          usuario:profiles(*)
        `)
        .eq('kit_id', kitId)
        .order('timestamp', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Obtener un kit específico por ID
   */
  getKit(kitId: string): Observable<KitCirugia> {
    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(
            *,
            hospital:hospitales(*),
            tipo_cirugia:tipos_cirugia(*),
            cliente:clientes(*)
          ),
          comercial:profiles!kits_cirugia_comercial_id_fkey(id, full_name, email, role),
          tecnico:profiles!kits_cirugia_tecnico_id_fkey(id, full_name, email, role),
          logistica:profiles!kits_cirugia_logistica_id_fkey(id, full_name, email, role)
        `)
        .eq('id', kitId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    );
  }

  /**
   * Obtener productos de un kit
   */
  getKitProductos(kitId: string): Observable<KitProducto[]> {
    return from(
      this.supabase.client
        .from('kit_productos')
        .select(`
          *,
          producto:productos(*)
        `)
        .eq('kit_id', kitId)
        .order('created_at', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }



  /**
   * Obtener todos los kits (con paginación)
   */
  getKits(page = 0, limit = 20): Observable<KitCirugia[]> {
    const from_index = page * limit;
    const to_index = from_index + limit - 1;

    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*)
        `)
        .range(from_index, to_index)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Buscar kits
   */
  buscarKits(query: string): Observable<KitCirugia[]> {
    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*)
        `)
        .or(`numero_kit.ilike.%${query}%,observaciones.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }
}