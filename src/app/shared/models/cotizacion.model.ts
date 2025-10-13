// ═══════════════════════════════════════════════════════════════════
// MODELOS DE COTIZACIONES
// ═══════════════════════════════════════════════════════════════════

export type CotizacionEstado = 
  | 'borrador' 
  | 'enviada' 
  | 'aprobada' 
  | 'rechazada' 
  | 'vencida'
  | 'cancelada';

export interface Cotizacion {
  id: string;
  numero_cotizacion: string;
  cliente_id: string;
  tipo_cirugia_id?: string;
  hospital_id?: string;
  medico_cirujano?: string;
  fecha_programada?: string;
  estado: CotizacionEstado;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_aprobacion?: string;
  fecha_rechazo?: string;
  
  // Valores monetarios
  subtotal: number;
  costo_transporte: number;
  descuento: number;
  porcentaje_descuento: number;
  iva: number;
  total: number;
  
  // Información adicional
  observaciones?: string;
  terminos_condiciones?: string;
  motivo_rechazo?: string;
  notas_internas?: string;
  
  // Información del comercial
  created_by: string;
  aprobada_por?: string;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  
  // Conversión a cirugía
  convertida_a_cirugia: boolean;
  cirugia_id?: string;
  
  // Relaciones (para joins)
  cliente?: {
    nombre: string;
    apellido: string;
    email?: string;
    telefono?: string;
    ciudad?: string;
  };
  tipo_cirugia?: {
    nombre: string;
    descripcion?: string;
  };
  hospital?: {
    nombre: string;
    ciudad?: string;
  };
  comercial?: {
    full_name: string;
    email: string;
  };
  items?: CotizacionItem[];
}

export interface CotizacionItem {
  id: string;
  cotizacion_id: string;
  producto_id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  observaciones?: string;
  orden: number;
  created_at: string;
  
  // Relación con producto (opcional)
  producto?: {
    codigo: string;
    nombre: string;
    categoria: string;
  };
}

export interface CotizacionHistorial {
  id: string;
  cotizacion_id: string;
  estado_anterior?: CotizacionEstado;
  estado_nuevo: CotizacionEstado;
  usuario_id: string;
  comentario?: string;
  timestamp: string;
  
  // Relación con usuario
  usuario?: {
    full_name: string;
    email: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// DTOs (Data Transfer Objects)
// ═══════════════════════════════════════════════════════════════════

export interface CreateCotizacionDTO {
  cliente_id: string;
  tipo_cirugia_id?: string;
  hospital_id?: string;
  medico_cirujano?: string;
  fecha_programada?: string;
  fecha_vencimiento: string;
  costo_transporte?: number;
  descuento?: number;
  porcentaje_descuento?: number;
  observaciones?: string;
  terminos_condiciones?: string;
  notas_internas?: string;
  items: CreateCotizacionItemDTO[];
}

export interface CreateCotizacionItemDTO {
  producto_id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  observaciones?: string;
  orden?: number;
}

export interface UpdateCotizacionDTO {
  cliente_id?: string;
  tipo_cirugia_id?: string;
  hospital_id?: string;
  medico_cirujano?: string;
  fecha_programada?: string;
  fecha_vencimiento?: string;
  costo_transporte?: number;
  descuento?: number;
  porcentaje_descuento?: number;
  observaciones?: string;
  terminos_condiciones?: string;
  notas_internas?: string;
  items?: CreateCotizacionItemDTO[];
}

export interface CambiarEstadoCotizacionDTO {
  estado: CotizacionEstado;
  motivo_rechazo?: string;
  comentario?: string;
}

export interface ConvertirACirugiaDTO {
  fecha_programada: string;
  hora_inicio?: string;
  medico_cirujano: string;
  tecnico_asignado_id?: string;
  notas?: string;
  prioridad?: 'baja' | 'normal' | 'alta' | 'urgente';
}

// ═══════════════════════════════════════════════════════════════════
// INTERFACES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════

export interface CotizacionStats {
  total: number;
  borradores: number;
  enviadas: number;
  aprobadas: number;
  rechazadas: number;
  vencidas: number;
  canceladas: number;
  valor_total_aprobadas: number;
  valor_total_enviadas: number;
  tasa_conversion: number; // % de enviadas que fueron aprobadas
}

export interface CotizacionFilters {
  estado?: CotizacionEstado;
  cliente_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  created_by?: string;
  search?: string; // Para buscar por número o cliente
  proximas_a_vencer?: boolean; // Vencen en los próximos 3 días
}

export const COTIZACION_ESTADO_LABELS: Record<CotizacionEstado, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
  cancelada: 'Cancelada'
};

export const COTIZACION_ESTADO_COLORS: Record<CotizacionEstado, string> = {
  borrador: 'gray',
  enviada: 'blue',
  aprobada: 'green',
  rechazada: 'red',
  vencida: 'orange',
  cancelada: 'gray'
};

export const TERMINOS_CONDICIONES_DEFAULT = `
TÉRMINOS Y CONDICIONES

1. VALIDEZ DE LA OFERTA
   Esta cotización tiene una validez de 15 días calendario desde la fecha de emisión.

2. PRECIOS
   Los precios incluyen IVA y están sujetos a cambios sin previo aviso después del vencimiento.

3. FORMA DE PAGO
   - 50% de anticipo al confirmar la cirugía
   - 50% restante 24 horas antes del procedimiento

4. ENTREGA Y LOGÍSTICA
   - El material será entregado en el hospital indicado
   - La entrega se realizará con 4 horas de anticipación al procedimiento
   - Incluye transporte y manipulación del material

5. RESPONSABILIDADES
   - IMPLAMEQ garantiza la calidad y esterilidad de todos los productos
   - El cliente debe confirmar la cirugía con 72 horas de anticipación mínimo
   - Cancelaciones con menos de 48 horas generan cargo del 30%

6. SOPORTE TÉCNICO
   - Personal técnico especializado presente durante el procedimiento
   - Asesoría post-operatoria incluida

7. GARANTÍA
   - Todos los productos cuentan con garantía del fabricante
   - Reemplazo inmediato en caso de defecto de fabricación

Para aceptar esta cotización, favor responder este correo o contactar a nuestro equipo comercial.

IMPLAMEQ S.A.S. - NIT: 900.123.456-7
Dirección: Cl. 5b 2 #30-14, 3 de Julio, Cali, Valle del Cauca
Teléfono: +57 301 7311282
Email: comercial@implameq.com
`.trim();
