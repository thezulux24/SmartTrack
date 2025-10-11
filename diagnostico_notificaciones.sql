-- ============================================
-- DIAGNÓSTICO DE NOTIFICACIONES
-- Ejecuta estas queries para verificar el estado
-- ============================================

-- 1. Verificar si la tabla existe
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'notificaciones'
) AS tabla_existe;

-- 2. Verificar si los tipos ENUM existen
SELECT EXISTS (
  SELECT FROM pg_type
  WHERE typname = 'notification_type'
) AS tipo_notification_type_existe,
EXISTS (
  SELECT FROM pg_type
  WHERE typname = 'notification_priority'
) AS tipo_notification_priority_existe;

-- 3. Ver todas las notificaciones (si existen)
SELECT 
  id,
  user_id,
  type,
  priority,
  title,
  message,
  read,
  created_at
FROM public.notificaciones
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'notificaciones';

-- 5. Verificar si Realtime está habilitado
SELECT 
  id,
  name,
  replica_identity
FROM pg_publication_tables
WHERE tablename = 'notificaciones';

-- 6. Ver funciones creadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%notification%'
ORDER BY routine_name;

-- 7. Ver triggers creados
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND (trigger_name LIKE '%notification%' 
       OR trigger_name LIKE '%cirugia%' 
       OR trigger_name LIKE '%kit%')
ORDER BY event_object_table, trigger_name;

-- 8. Contar notificaciones por usuario
SELECT 
  user_id,
  COUNT(*) AS total,
  SUM(CASE WHEN read = false THEN 1 ELSE 0 END) AS no_leidas
FROM public.notificaciones
GROUP BY user_id;

-- ============================================
-- RESULTADO ESPERADO SI TODO ESTÁ BIEN:
-- ============================================
-- 1. tabla_existe: true
-- 2. ambos tipos: true
-- 3. Puede estar vacío (sin notificaciones aún)
-- 4. Debe mostrar 4 policies
-- 5. Debe mostrar la tabla
-- 6. Debe mostrar 3 funciones (get_unread, mark_all, cleanup)
-- 7. Debe mostrar 2 triggers (cirugia, kit)
-- 8. Puede estar vacío

-- ============================================
-- SI ALGO FALLA, EJECUTA notificaciones_schema.sql
-- ============================================
