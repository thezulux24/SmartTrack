-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Corregir políticas RLS de cotizaciones
-- Fecha: 2025-10-13
-- Descripción: Permitir INSERT en historial y UPDATE en cotizaciones desde triggers
-- ═══════════════════════════════════════════════════════════════════

-- Eliminar políticas restrictivas
DROP POLICY IF EXISTS cotizaciones_comercial_policy ON public.cotizaciones;
DROP POLICY IF EXISTS cotizacion_items_policy ON public.cotizacion_items;
DROP POLICY IF EXISTS cotizacion_historial_policy ON public.cotizacion_historial;

-- Política para cotizaciones (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY cotizaciones_all_policy ON public.cotizaciones
  FOR ALL
  USING (
    -- Puede ver: comerciales sus propias cotizaciones, admins todas
    created_by = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    -- Puede crear/editar: comerciales y admins
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('comercial', 'admin'))
  );

-- Política para items (hereda permisos de cotización)
CREATE POLICY cotizacion_items_all_policy ON public.cotizacion_items
  FOR ALL
  USING (
    cotizacion_id IN (
      SELECT id FROM cotizaciones
      WHERE created_by = auth.uid() OR 
            auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  )
  WITH CHECK (
    cotizacion_id IN (
      SELECT id FROM cotizaciones
      WHERE created_by = auth.uid() OR 
            auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );

-- Política para historial (permisiva para triggers)
CREATE POLICY cotizacion_historial_select_policy ON public.cotizacion_historial
  FOR SELECT
  USING (
    cotizacion_id IN (
      SELECT id FROM cotizaciones
      WHERE created_by = auth.uid() OR 
            auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  );

-- Permitir INSERT en historial sin restricciones (para triggers)
CREATE POLICY cotizacion_historial_insert_policy ON public.cotizacion_historial
  FOR INSERT
  WITH CHECK (true);

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS corregidas para cotizaciones';
  RAISE NOTICE '🔓 Triggers pueden ahora insertar en historial';
  RAISE NOTICE '🔓 Triggers pueden actualizar totales';
END $$;
