-- ============================================
-- VERIFICACIÓN DE RLS EN NOTIFICACIONES
-- ============================================

-- 1. Ver si la tabla tiene RLS habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notificaciones';

-- 2. Ver todas las políticas de la tabla notificaciones
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd, -- Comando: SELECT, INSERT, UPDATE, DELETE, ALL
  qual, -- Condición USING (para SELECT/UPDATE/DELETE)
  with_check -- Condición WITH CHECK (para INSERT/UPDATE)
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'notificaciones';

-- 3. Ver el owner de la tabla
SELECT 
  t.tablename,
  t.tableowner,
  CASE 
    WHEN t.tableowner = current_user THEN '✅ Eres el owner'
    ELSE '⚠️ NO eres el owner'
  END as owner_status
FROM pg_tables t
WHERE t.schemaname = 'public' 
  AND t.tablename = 'notificaciones';

-- 4. Ver tu rol actual
SELECT current_user, session_user;

-- 5. Test de INSERT (comentado para seguridad)
/*
-- Descomenta esto para probar INSERT manual:
INSERT INTO notificaciones (
  user_id, 
  type, 
  priority, 
  title, 
  message, 
  icon,
  icon_color,
  read
) VALUES (
  auth.uid(), -- Usa tu user_id actual
  'sistema',
  'high',
  'Test Manual RLS',
  'Probando política de INSERT',
  '🧪',
  'text-blue-500',
  false
);
*/
