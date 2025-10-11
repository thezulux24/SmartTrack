-- ============================================
-- HABILITAR REALTIME PARA NOTIFICACIONES
-- ============================================

-- 1. Habilitar Realtime en la tabla notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;

-- 2. Verificar que se habilitó correctamente
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN tablename = ANY(
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) THEN '✅ Realtime HABILITADO'
    ELSE '❌ Realtime NO habilitado'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'notificaciones';

-- 3. Ver todas las tablas con Realtime habilitado
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
