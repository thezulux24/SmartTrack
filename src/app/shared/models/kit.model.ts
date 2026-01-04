export type EstadoKit = 
  | 'solicitado'
  | 'preparando' 
  | 'listo_envio'
  | 'en_transito'
  | 'entregado'
  | 'en_uso'
  | 'devuelto'
  | 'finalizado'
  | 'cancelado';

export interface KitCirugia {
  id: string;
  cirugia_id: string;
  numero_kit: string;
  qr_code: string;
  estado: EstadoKit;
  fecha_creacion: string;
  fecha_preparacion?: string;
  fecha_envio?: string;
  fecha_recepcion?: string;
  fecha_devolucion?: string;
  comercial_id?: string;
  tecnico_id?: string;
  logistica_id?: string;
  observaciones?: string;
  ubicacion_actual?: string;
  created_at: string;
  updated_at: string;
  cliente_receptor_nombre?: string;
  cliente_receptor_cedula?: string;
  cliente_validacion_fecha?: string;
  cliente_validacion_qr?: string;
  
  // Relaciones
  cirugia?: any;
  productos?: KitProducto[];
  trazabilidad?: KitTrazabilidad[];
  comercial?: any;
  tecnico?: any;
  logistica?: any;
}

export interface KitProducto {
  id: string;
  kit_id: string;
  producto_id: string;
  cantidad_solicitada: number;
  cantidad_preparada: number;
  cantidad_enviada: number;
  cantidad_utilizada: number;
  cantidad_devuelta: number;
  precio_unitario?: number;
  lote?: string;
  fecha_vencimiento?: string;
  observaciones?: string;
  created_at: string;
  
  // Relaciones
  producto?: any; // Usaremos el modelo existente de productos
}

export interface KitTrazabilidad {
  id: string;
  kit_id: string;
  accion: string;
  estado_anterior?: string;
  estado_nuevo: string;
  usuario_id: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  timestamp: string;
  observaciones?: string;
  metadata?: any;
  
  // Relaciones
  usuario?: any;
}

export interface QrCode {
  id: string;
  codigo: string;
  tipo: 'kit' | 'producto' | 'ubicacion';
  referencia_id: string;
  es_activo: boolean;
  fecha_generacion: string;
  fecha_expiracion?: string;
  veces_escaneado: number;
  ultimo_escaneo?: string;
  created_at: string;
}

export interface QrEscaneo {
  id: string;
  qr_code_id: string;
  usuario_id?: string;
  fecha_escaneo: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  dispositivo_info?: any;
  accion_realizada?: string;
  resultado: 'exitoso' | 'error' | 'rechazado';
  observaciones?: string;
  
  // Relaciones
  qr_code?: QrCode;
  usuario?: any;
}

// DTOs para crear/actualizar
export interface CreateKitRequest {
  cirugia_id: string;
  productos: Array<{
    producto_id: string;
    cantidad_solicitada: number;
    observaciones?: string;
  }>;
  observaciones?: string;
}

export interface UpdateKitEstadoRequest {
  estado: KitCirugia['estado'];
  observaciones?: string;
  ubicacion_actual?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  usuario_id?: string;
}

export interface RegistrarTrazabilidadRequest {
  kit_id: string;
  usuario_id: string;
  accion: string;
  estado_anterior?: string;
  estado_nuevo: string;
  ubicacion?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  observaciones?: string;
  metadata?: any;
}

export interface RegistrarConsumoRequest {
  productos: Array<{
    kit_producto_id: string;
    cantidad_utilizada: number;
    observaciones?: string;
  }>;
}