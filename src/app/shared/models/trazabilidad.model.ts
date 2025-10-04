// Modelo de trazabilidad unificado para cirugías y kits

export type TipoEntidadTrazabilidad = 'cirugia' | 'kit';

export type AccionTrazabilidad = 
  // Acciones de Cirugía
  | 'cirugia_creada'
  | 'cirugia_actualizada'
  | 'estado_cambiado'
  | 'tecnico_asignado'
  | 'tecnico_reasignado'
  | 'kit_asignado'
  | 'fecha_reprogramada'
  | 'cirugia_iniciada'
  | 'cirugia_finalizada'
  | 'cirugia_cancelada'
  
  // Acciones de Kit
  | 'kit_creado'
  | 'kit_aprobado'
  | 'kit_rechazado'
  | 'preparacion_iniciada'
  | 'producto_agregado'
  | 'producto_retirado'
  | 'kit_listo'
  | 'kit_despachado'
  | 'kit_en_transito'
  | 'kit_entregado'
  | 'kit_recibido'
  | 'kit_en_uso'
  | 'kit_devuelto'
  | 'kit_lavado'
  | 'kit_esterilizado'
  | 'kit_finalizado'
  | 'qr_escaneado';

export interface CirugiaTrazabilidad {
  id: string;
  cirugia_id: string;
  accion: AccionTrazabilidad;
  estado_anterior?: string;
  estado_nuevo: string;
  usuario_id: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  timestamp: string;
  observaciones?: string;
  metadata?: Record<string, any>;
  
  // Relaciones expandidas
  usuario?: {
    id: string;
    full_name: string;
    role: string;
    email?: string;
  };
  cirugia?: {
    id: string;
    numero_cirugia: string;
    estado: string;
  };
}

export interface KitTrazabilidad {
  id: string;
  kit_id: string;
  accion: AccionTrazabilidad;
  estado_anterior?: string;
  estado_nuevo: string;
  usuario_id: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  timestamp: string;
  observaciones?: string;
  metadata?: Record<string, any>;
  
  // Relaciones expandidas
  usuario?: {
    id: string;
    full_name: string;
    role: string;
    email?: string;
  };
  kit?: {
    id: string;
    numero_kit: string;
    estado: string;
  };
}

export interface TrazabilidadCompleta {
  id: string;
  tipo_entidad: TipoEntidadTrazabilidad;
  referencia_id: string;
  referencia_numero: string;
  accion: AccionTrazabilidad;
  estado_anterior?: string;
  estado_nuevo: string;
  timestamp: string;
  observaciones?: string;
  usuario_id: string;
  usuario_nombre?: string;
  usuario_rol?: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  metadata?: Record<string, any>;
}

export interface CreateCirugiaTrazabilidadRequest {
  cirugia_id: string;
  accion: AccionTrazabilidad;
  estado_anterior?: string;
  estado_nuevo: string;
  observaciones?: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  metadata?: Record<string, any>;
}

export interface CreateKitTrazabilidadRequest {
  kit_id: string;
  accion: AccionTrazabilidad;
  estado_anterior?: string;
  estado_nuevo: string;
  observaciones?: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  metadata?: Record<string, any>;
}

// Filtros para búsqueda de trazabilidad
export interface TrazabilidadFilters {
  tipo_entidad?: TipoEntidadTrazabilidad;
  referencia_id?: string;
  usuario_id?: string;
  accion?: AccionTrazabilidad;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: string;
}

// Estadísticas de trazabilidad
export interface TrazabilidadStats {
  total_eventos: number;
  eventos_por_tipo: Record<TipoEntidadTrazabilidad, number>;
  eventos_por_accion: Record<string, number>;
  ultimos_eventos: TrazabilidadCompleta[];
}
