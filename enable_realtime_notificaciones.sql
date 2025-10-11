-- ============================================
-- HABILITAR REALTIME PARA NOTIFICACIONES
-- ============================================

-- PASO 1: Verificar estado ANTES de habilitar
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) THEN '✅ YA está habilitado'
    ELSE '❌ NO está habilitado (se habilitará ahora)'
  END as estado_actual
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'notificaciones';

-- PASO 2: Habilitar Realtime en la tabla notificaciones
-- Si ya está habilitado, esto no hará nada malo
DO $$ 
BEGIN
  -- Intentar agregar la tabla a la publicación
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
  RAISE NOTICE '✅ Realtime habilitado para notificaciones';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ Realtime ya estaba habilitado para notificaciones';
END $$;

-- PASO 3: Verificar que se habilitó correctamente
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) THEN '✅ Realtime HABILITADO correctamente'
    ELSE '❌ ERROR: Realtime NO se habilitó'
  END as estado_final
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'notificaciones';

-- PASO 4: Ver todas las tablas con Realtime habilitado
SELECT 
  schemaname,
  tablename,
  '✅ Realtime activo' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
