-- Agregar nuevos tipos de notificación al enum notification_type
-- Estos tipos ya están definidos en el frontend pero faltan en la base de datos

-- Tipos que faltan:
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cambio_agenda';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'asignacion_mensajero';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cambio_estado_envio';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'retraso_envio';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'error_logistico';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'solicitud_urgente';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cambio_estado_hoja_gasto';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'aprobacion_pendiente';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'incidente_cirugia';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cirugia_cancelada';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cotizacion_aprobada';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cotizacion_rechazada';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cotizacion_proxima_vencer';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cotizacion_vencida';

-- Verificar los valores del enum
-- SELECT unnest(enum_range(NULL::notification_type));
