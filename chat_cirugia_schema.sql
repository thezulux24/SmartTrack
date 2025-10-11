-- ============================================
-- SISTEMA DE MENSAJERÍA POR CIRUGÍA
-- ============================================
-- Permite comunicación en tiempo real entre:
-- - Comercial (asesor)
-- - Técnico (soporte en campo)
-- - Logística (coordinador)
-- Agrupados por cirugía específica

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS public.mensajes_cirugia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cirugia_id UUID NOT NULL REFERENCES public.cirugias(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'texto', -- 'texto', 'imagen', 'documento', 'ubicacion', 'alerta'
  metadata JSONB DEFAULT '{}', -- Para archivos: {url, nombre, tipo}, ubicación: {lat, lng}, etc.
  leido_por JSONB DEFAULT '[]', -- Array de user_ids que leyeron el mensaje
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_mensajes_cirugia_id ON public.mensajes_cirugia(cirugia_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_usuario_id ON public.mensajes_cirugia(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON public.mensajes_cirugia(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_cirugia_created ON public.mensajes_cirugia(cirugia_id, created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_mensajes_cirugia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mensajes_cirugia_updated_at
  BEFORE UPDATE ON public.mensajes_cirugia
  FOR EACH ROW
  EXECUTE FUNCTION update_mensajes_cirugia_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.mensajes_cirugia ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver mensajes de cirugías en las que están involucrados
CREATE POLICY "Users can view messages from their surgeries"
  ON public.mensajes_cirugia
  FOR SELECT
  USING (
    -- Usuario es el creador del mensaje
    auth.uid() = usuario_id
    OR
    -- Usuario es el creador de la cirugía (comercial)
    EXISTS (
      SELECT 1 FROM public.cirugias
      WHERE cirugias.id = mensajes_cirugia.cirugia_id
      AND cirugias.usuario_creador_id = auth.uid()
    )
    OR
    -- Usuario es el técnico asignado
    EXISTS (
      SELECT 1 FROM public.cirugias
      WHERE cirugias.id = mensajes_cirugia.cirugia_id
      AND cirugias.tecnico_asignado_id = auth.uid()
    )
    OR
    -- Usuario es logística (preparó algún kit de la cirugía O tiene rol logistica)
    EXISTS (
      SELECT 1 FROM public.kits_cirugia
      WHERE kits_cirugia.cirugia_id = mensajes_cirugia.cirugia_id
      AND kits_cirugia.logistica_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'logistica'
    )
    OR
    -- Usuario es admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Los usuarios pueden insertar mensajes en cirugías donde están involucrados
CREATE POLICY "Users can send messages to their surgeries"
  ON public.mensajes_cirugia
  FOR INSERT
  WITH CHECK (
    -- Usuario autenticado
    auth.uid() = usuario_id
    AND
    (
      -- Usuario es el creador de la cirugía (comercial)
      EXISTS (
        SELECT 1 FROM public.cirugias
        WHERE cirugias.id = cirugia_id
        AND cirugias.usuario_creador_id = auth.uid()
      )
      OR
      -- Usuario es el técnico asignado
      EXISTS (
        SELECT 1 FROM public.cirugias
        WHERE cirugias.id = cirugia_id
        AND cirugias.tecnico_asignado_id = auth.uid()
      )
      OR
      -- Usuario es logística (preparó algún kit O tiene rol logistica)
      EXISTS (
        SELECT 1 FROM public.kits_cirugia
        WHERE kits_cirugia.cirugia_id = cirugia_id
        AND kits_cirugia.logistica_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'logistica'
      )
      OR
      -- Usuario es admin
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  );

-- Política: Los usuarios pueden actualizar sus propios mensajes (marcar como leído)
CREATE POLICY "Users can update their messages read status"
  ON public.mensajes_cirugia
  FOR UPDATE
  USING (
    -- Puede actualizar si tiene acceso a ver el mensaje
    EXISTS (
      SELECT 1 FROM public.cirugias
      WHERE cirugias.id = mensajes_cirugia.cirugia_id
      AND (
        cirugias.usuario_creador_id = auth.uid()
        OR cirugias.tecnico_asignado_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.kits_cirugia
      WHERE kits_cirugia.cirugia_id = mensajes_cirugia.cirugia_id
      AND kits_cirugia.logistica_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'logistica'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- VISTA AUXILIAR: Mensajes con info de usuario y cirugía
-- ============================================

CREATE OR REPLACE VIEW public.mensajes_cirugia_completos AS
SELECT 
  m.id,
  m.cirugia_id,
  m.usuario_id,
  m.mensaje,
  m.tipo,
  m.metadata,
  m.leido_por,
  m.created_at,
  m.updated_at,
  -- Info del usuario que envió
  p.full_name as usuario_nombre,
  p.role as usuario_rol,
  p.email as usuario_email,
  -- Info de la cirugía
  c.numero_cirugia,
  c.estado as cirugia_estado,
  c.fecha_programada as cirugia_fecha
FROM public.mensajes_cirugia m
INNER JOIN public.profiles p ON m.usuario_id = p.id
INNER JOIN public.cirugias c ON m.cirugia_id = c.id
ORDER BY m.created_at ASC;

-- ============================================
-- FUNCIÓN: Obtener conteo de mensajes no leídos por cirugía
-- ============================================

CREATE OR REPLACE FUNCTION public.get_unread_messages_count(p_user_id UUID, p_cirugia_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.mensajes_cirugia
    WHERE cirugia_id = p_cirugia_id
    AND usuario_id != p_user_id -- No contar mis propios mensajes
    AND NOT (leido_por @> jsonb_build_array(p_user_id::text)) -- No está en leido_por
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN: Marcar mensajes como leídos
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_cirugia_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.mensajes_cirugia
  SET leido_por = CASE 
    WHEN leido_por IS NULL THEN jsonb_build_array(p_user_id::text)
    WHEN NOT (leido_por @> jsonb_build_array(p_user_id::text)) 
      THEN leido_por || jsonb_build_array(p_user_id::text)
    ELSE leido_por
  END,
  updated_at = NOW()
  WHERE cirugia_id = p_cirugia_id
  AND usuario_id != p_user_id -- No marcar mis propios mensajes
  AND NOT (leido_por @> jsonb_build_array(p_user_id::text));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE public.mensajes_cirugia IS 'Mensajes de chat grupal por cirugía para comunicación entre comercial, técnico y logística';
COMMENT ON COLUMN public.mensajes_cirugia.tipo IS 'Tipo de mensaje: texto, imagen, documento, ubicacion, alerta';
COMMENT ON COLUMN public.mensajes_cirugia.metadata IS 'Datos adicionales: archivos adjuntos, coordenadas GPS, etc.';
COMMENT ON COLUMN public.mensajes_cirugia.leido_por IS 'Array de UUIDs de usuarios que leyeron el mensaje';

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL - COMENTAR EN PRODUCCIÓN)
-- ============================================

-- Insertar mensaje de ejemplo (comentar en producción)
-- INSERT INTO public.mensajes_cirugia (cirugia_id, usuario_id, mensaje, tipo)
-- SELECT 
--   c.id,
--   c.usuario_creador_id,
--   '¡Hola equipo! La cirugía está confirmada para mañana a las 8:00 AM',
--   'texto'
-- FROM public.cirugias c
-- WHERE c.estado = 'programada'
-- LIMIT 1;

-- ============================================
-- FINALIZACIÓN
-- ============================================

-- Verificación de tablas creadas
SELECT 
  'mensajes_cirugia' as tabla,
  COUNT(*) as registros
FROM public.mensajes_cirugia
UNION ALL
SELECT 
  'Políticas RLS activas' as tabla,
  COUNT(*)::INTEGER as registros
FROM pg_policies 
WHERE tablename = 'mensajes_cirugia';
