// ============================================
// MODELOS DE NOTIFICACIONES
// ============================================

export type NotificationType = 
  | 'nuevo_mensaje'
  | 'cambio_estado_cirugia'
  | 'cambio_estado_kit'
  | 'alerta_stock'
  | 'alerta_vencimiento'
  | 'asignacion_cirugia'
  | 'cambio_agenda'              // Cambios en fecha/hora/técnico de cirugía
  | 'asignacion_mensajero'        // Mensajero asignado a envío
  | 'cambio_estado_envio'         // Estado de envío cambia
  | 'retraso_envio'               // Envío retrasado
  | 'error_logistico'             // Error en logística
  | 'solicitud_urgente'           // Solicitud urgente
  | 'cambio_estado_hoja_gasto'    // Estado hoja de gasto cambia
  | 'aprobacion_pendiente'        // Hoja de gasto necesita aprobación
  | 'incidente_cirugia'           // Incidente durante cirugía
  | 'cirugia_cancelada'           // Cirugía cancelada
  | 'cotizacion_aprobada'         // 🆕 Cotización aprobada por cliente
  | 'cotizacion_rechazada'        // 🆕 Cotización rechazada
  | 'cotizacion_proxima_vencer'   // 🆕 Cotización próxima a vencer
  | 'cotizacion_vencida'          // 🆕 Cotización vencida sin respuesta
  | 'sistema';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  icon_color?: string;
  link?: string; // Ruta para navegar al hacer clic
  data?: NotificationData;
  read: boolean;
  created_at: string;
  user_id: string;
}

export interface NotificationData {
  // Para mensajes de chat
  cirugia_id?: string;
  mensaje_id?: string;
  remitente_nombre?: string;
  
  // Para cambios de estado
  kit_id?: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  numero_cirugia?: string;
  
  // Para alertas de inventario
  producto_id?: string;
  producto_nombre?: string;
  cantidad_actual?: number;
  cantidad_minima?: number;
  fecha_vencimiento?: string;
  
  // Para envíos y logística
  envio_id?: string;
  mensajero_id?: string;
  mensajero_nombre?: string;
  direccion_destino?: string;
  fecha_programada?: string;
  motivo_retraso?: string;
  
  // Para hojas de gasto
  hoja_gasto_id?: string;
  monto_total?: number;
  aprobador_id?: string;
  
  // Para cambios de agenda
  fecha_anterior?: string;
  fecha_nueva?: string;
  tecnico_anterior_id?: string;
  tecnico_nuevo_id?: string;
  hospital_nombre?: string;
  motivo_cambio?: string;
  
  // Para incidentes
  tipo_incidente?: string;
  descripcion_incidente?: string;
  
  // Para cotizaciones 🆕
  cotizacion_id?: string;
  numero_cotizacion?: string;
  cliente_nombre?: string;
  total?: number;
  dias_hasta_vencimiento?: number;
  
  // Datos adicionales
  [key: string]: any;
}

export interface NotificationConfig {
  showToast: boolean;
  playSound: boolean;
  vibrate: boolean;
  duration?: number; // ms para el toast
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
}
