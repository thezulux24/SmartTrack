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
