/**
 * Modelos para el flujo de limpieza y esterilización
 */

export interface KitProductoLimpieza {
  id: string;
  kit_producto_id: string;
  kit_id: string;
  producto_id: string;
  estado_limpieza: EstadoLimpieza;
  cantidad_a_recuperar: number;
  cantidad_aprobada: number;
  es_desechable: boolean;
  notas?: string;
  observaciones_limpieza?: string;
  procesado_por?: string;
  fecha_inicio_proceso?: string;
  fecha_fin_proceso?: string;
  aprobado_por?: string;
  fecha_aprobacion?: string;
  created_at: string;
  updated_at: string;
  
  // Nuevos campos de la migración
  estado?: EstadoRecepcion;
  fecha_devuelto_limpio?: string;
  recibido_por_id?: string;
  observaciones_recepcion?: string;
  
  // Relaciones expandidas
  producto?: {
    id: string;
    codigo: string;
    nombre: string;
    categoria: string;
  };
  kit?: {
    id: string;
    numero_kit: string;
    cirugia_id: string;
    estado: string;
  };
  kit_producto?: {
    id: string;
    lote?: string;
    fecha_vencimiento?: string;
  };
}

export type EstadoLimpieza = 'pendiente' | 'en_proceso' | 'esterilizado' | 'aprobado' | 'desechado';

export type EstadoRecepcion = 'enviado_limpieza' | 'devuelto_limpio' | 'en_inventario';

export interface KitLimpiezaAgrupado {
  kit_id: string;
  numero_kit: string;
  cirugia_id: string;
  fecha_inicio_limpieza: string;
  total_productos: number;
  productos_pendientes: number;
  productos: KitProductoLimpieza[];
}

export interface ConfirmarRecepcionRequest {
  kit_id: string;
  productos_ids: string[]; // IDs de kit_productos_limpieza
  observaciones?: string;
  recibido_por_id: string;
}

export interface ActualizarInventarioRequest {
  producto_id: string;
  cantidad: number;
  kit_id: string;
  usuario_id: string;
  lote?: string;
  fecha_vencimiento?: string;
}
