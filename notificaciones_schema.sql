-- ============================================
-- SCHEMA DE NOTIFICACIONES
-- Sistema de notificaciones push en tiempo real
-- ============================================

-- Tipo de notificación
CREATE TYPE notification_type AS ENUM (
  'nuevo_mensaje',
  'cambio_estado_cirugia',
  'cambio_estado_kit',
  'alerta_stock',
  'alerta_vencimiento',
  'asignacion_cirugia',
  'sistema'
);

-- Prioridad de notificación
CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- ============================================
-- TABLA: notificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  icon_color TEXT,
  link TEXT, -- Ruta para navegación
  data JSONB DEFAULT '{}', -- Datos adicionales
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para optimizar consultas
  CONSTRAINT notificaciones_user_id_check CHECK (user_id IS NOT NULL)
);

-- Índices
CREATE INDEX idx_notificaciones_user_id ON public.notificaciones(user_id);
CREATE INDEX idx_notificaciones_read ON public.notificaciones(read);
CREATE INDEX idx_notificaciones_created_at ON public.notificaciones(created_at DESC);
CREATE INDEX idx_notificaciones_type ON public.notificaciones(type);
CREATE INDEX idx_notificaciones_user_unread ON public.notificaciones(user_id, read) WHERE read = FALSE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications"
ON public.notificaciones
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Sistema puede insertar notificaciones para cualquier usuario
CREATE POLICY "System can insert notifications"
ON public.notificaciones
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Los usuarios solo pueden actualizar sus propias notificaciones
CREATE POLICY "Users can update their own notifications"
ON public.notificaciones
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete their own notifications"
ON public.notificaciones
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- FUNCIÓN: Obtener contador de no leídas
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.notificaciones
  WHERE user_id = p_user_id
    AND read = FALSE;
    
  RETURN v_count;
END;
$$;

-- ============================================
-- FUNCIÓN: Marcar todas como leídas
-- ============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notificaciones
  SET read = TRUE
  WHERE user_id = p_user_id
    AND read = FALSE;
END;
$$;

-- ============================================
-- FUNCIÓN: Limpiar notificaciones antiguas
-- (Ejecutar mensualmente vía cron job)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Eliminar notificaciones leídas con más de 30 días
  DELETE FROM public.notificaciones
  WHERE read = TRUE
    AND created_at < NOW() - INTERVAL '30 days';
    
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN v_deleted;
END;
$$;

-- ============================================
-- FUNCIÓN: Notificar cambio de estado de cirugía
-- (Trigger automático)
-- ============================================
CREATE OR REPLACE FUNCTION notify_cirugia_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participante_id UUID;
  v_numero_cirugia TEXT;
BEGIN
  -- Solo si el estado cambió
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    
    -- Obtener número de cirugía
    v_numero_cirugia := NEW.numero_cirugia;
    
    -- Notificar al creador
    IF NEW.usuario_creador_id IS NOT NULL THEN
      INSERT INTO public.notificaciones (
        user_id,
        type,
        priority,
        title,
        message,
        icon,
        icon_color,
        link,
        data
      ) VALUES (
        NEW.usuario_creador_id,
        'cambio_estado_cirugia',
        'high',
        v_numero_cirugia || ' cambió de estado',
        'De "' || COALESCE(OLD.estado, 'sin estado') || '" a "' || NEW.estado || '"',
        '🏥',
        'text-blue-500',
        '/internal/agenda',
        jsonb_build_object(
          'cirugia_id', NEW.id,
          'numero_cirugia', v_numero_cirugia,
          'estado_anterior', OLD.estado,
          'estado_nuevo', NEW.estado
        )
      );
    END IF;
    
    -- Notificar al técnico asignado (si es diferente del creador)
    IF NEW.tecnico_asignado_id IS NOT NULL 
       AND NEW.tecnico_asignado_id != NEW.usuario_creador_id THEN
      INSERT INTO public.notificaciones (
        user_id,
        type,
        priority,
        title,
        message,
        icon,
        icon_color,
        link,
        data
      ) VALUES (
        NEW.tecnico_asignado_id,
        'cambio_estado_cirugia',
        'high',
        v_numero_cirugia || ' cambió de estado',
        'De "' || COALESCE(OLD.estado, 'sin estado') || '" a "' || NEW.estado || '"',
        '🏥',
        'text-blue-500',
        '/internal/agenda',
        jsonb_build_object(
          'cirugia_id', NEW.id,
          'numero_cirugia', v_numero_cirugia,
          'estado_anterior', OLD.estado,
          'estado_nuevo', NEW.estado
        )
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para cambios de estado de cirugía
DROP TRIGGER IF EXISTS trigger_cirugia_status_change ON public.cirugias;
CREATE TRIGGER trigger_cirugia_status_change
AFTER UPDATE ON public.cirugias
FOR EACH ROW
EXECUTE FUNCTION notify_cirugia_status_change();

-- ============================================
-- FUNCIÓN: Notificar cambio de estado de kit
-- ============================================
CREATE OR REPLACE FUNCTION notify_kit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cirugia_record RECORD;
BEGIN
  -- Solo si el estado cambió
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    
    -- Obtener info de la cirugía
    SELECT numero_cirugia, usuario_creador_id, tecnico_asignado_id
    INTO v_cirugia_record
    FROM public.cirugias
    WHERE id = NEW.cirugia_id;
    
    -- Notificar al creador de la cirugía
    IF v_cirugia_record.usuario_creador_id IS NOT NULL THEN
      INSERT INTO public.notificaciones (
        user_id,
        type,
        priority,
        title,
        message,
        icon,
        icon_color,
        link,
        data
      ) VALUES (
        v_cirugia_record.usuario_creador_id,
        'cambio_estado_kit',
        'medium',
        'Kit de ' || v_cirugia_record.numero_cirugia || ' actualizado',
        'Estado: ' || NEW.estado,
        '📦',
        'text-green-500',
        '/internal/logistica',
        jsonb_build_object(
          'kit_id', NEW.id,
          'cirugia_id', NEW.cirugia_id,
          'numero_cirugia', v_cirugia_record.numero_cirugia,
          'estado_anterior', OLD.estado,
          'estado_nuevo', NEW.estado
        )
      );
    END IF;
    
    -- Notificar al técnico si existe y es diferente
    IF v_cirugia_record.tecnico_asignado_id IS NOT NULL 
       AND v_cirugia_record.tecnico_asignado_id != v_cirugia_record.usuario_creador_id THEN
      INSERT INTO public.notificaciones (
        user_id,
        type,
        priority,
        title,
        message,
        icon,
        icon_color,
        link,
        data
      ) VALUES (
        v_cirugia_record.tecnico_asignado_id,
        'cambio_estado_kit',
        'medium',
        'Kit de ' || v_cirugia_record.numero_cirugia || ' actualizado',
        'Estado: ' || NEW.estado,
        '📦',
        'text-green-500',
        '/internal/logistica',
        jsonb_build_object(
          'kit_id', NEW.id,
          'cirugia_id', NEW.cirugia_id,
          'numero_cirugia', v_cirugia_record.numero_cirugia,
          'estado_anterior', OLD.estado,
          'estado_nuevo', NEW.estado
        )
      );
    END IF;
    
    -- Notificar al que preparó el kit
    IF NEW.preparado_por_id IS NOT NULL 
       AND NEW.preparado_por_id != v_cirugia_record.usuario_creador_id
       AND NEW.preparado_por_id != v_cirugia_record.tecnico_asignado_id THEN
      INSERT INTO public.notificaciones (
        user_id,
        type,
        priority,
        title,
        message,
        icon,
        icon_color,
        link,
        data
      ) VALUES (
        NEW.preparado_por_id,
        'cambio_estado_kit',
        'medium',
        'Kit de ' || v_cirugia_record.numero_cirugia || ' actualizado',
        'Estado: ' || NEW.estado,
        '📦',
        'text-green-500',
        '/internal/logistica',
        jsonb_build_object(
          'kit_id', NEW.id,
          'cirugia_id', NEW.cirugia_id,
          'numero_cirugia', v_cirugia_record.numero_cirugia,
          'estado_anterior', OLD.estado,
          'estado_nuevo', NEW.estado
        )
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para cambios de estado de kit
DROP TRIGGER IF EXISTS trigger_kit_status_change ON public.kits_cirugia;
CREATE TRIGGER trigger_kit_status_change
AFTER UPDATE ON public.kits_cirugia
FOR EACH ROW
EXECUTE FUNCTION notify_kit_status_change();

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE public.notificaciones IS 'Notificaciones push en tiempo real para usuarios';
COMMENT ON COLUMN public.notificaciones.data IS 'Datos adicionales en formato JSON para contexto de la notificación';
COMMENT ON COLUMN public.notificaciones.link IS 'Ruta de navegación al hacer clic en la notificación';
COMMENT ON FUNCTION get_unread_notifications_count IS 'Obtiene el conteo de notificaciones no leídas de un usuario';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marca todas las notificaciones de un usuario como leídas';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Limpia notificaciones leídas antiguas (ejecutar mensualmente)';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  'Tabla notificaciones creada' AS status,
  COUNT(*) AS total_notifications
FROM public.notificaciones;
