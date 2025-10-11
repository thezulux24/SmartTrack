-- ============================================
-- ACTUALIZACIÓN: Permitir a Logística enviar mensajes
-- ============================================
-- Este script actualiza las políticas RLS para que
-- CUALQUIER usuario con rol 'logistica' pueda:
-- 1. Ver todos los chats de cirugías
-- 2. Enviar mensajes en cualquier chat
-- 3. Marcar mensajes como leídos
--
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. ELIMINAR políticas antiguas
DROP POLICY IF EXISTS "Users can view messages from their surgeries" ON public.mensajes_cirugia;
DROP POLICY IF EXISTS "Users can send messages to their surgeries" ON public.mensajes_cirugia;
DROP POLICY IF EXISTS "Users can update their messages read status" ON public.mensajes_cirugia;

-- 2. CREAR políticas nuevas con acceso completo para logística

-- Política SELECT: Ver mensajes
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

-- Política INSERT: Enviar mensajes
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

-- Política UPDATE: Marcar como leído
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
-- VERIFICACIÓN
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'mensajes_cirugia'
ORDER BY policyname;

-- Resultado esperado: 3 políticas
-- 1. Users can view messages from their surgeries (SELECT)
-- 2. Users can send messages to their surgeries (INSERT)
-- 3. Users can update their messages read status (UPDATE)

-- ============================================
-- NOTAS
-- ============================================
-- ✅ ANTES: Logística solo podía ver/enviar en cirugías con kit asignado
-- ✅ DESPUÉS: Logística puede ver/enviar en TODAS las cirugías
--
-- Esto tiene sentido porque:
-- 1. Logística coordina todos los envíos
-- 2. Puede necesitar comunicarse antes de asignar kit
-- 3. Puede coordinar múltiples cirugías simultáneas
-- 4. Facilita la comunicación proactiva
