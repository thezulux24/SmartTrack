-- ============================================
-- TEST DIRECTO - Crear Notificación Manual
-- ============================================

-- PASO 1: Verificar que la tabla existe y está vacía
SELECT COUNT(*) as total_notificaciones FROM public.notificaciones;

-- PASO 2: Obtener tu USER ID actual
-- (Ejecuta esto primero para obtener tu ID)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as nombre
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- PASO 3: Insertar una notificación de prueba
-- ⚠️ REEMPLAZA 'TU-USER-ID-AQUI' con el ID que obtuviste en el paso anterior

INSERT INTO public.notificaciones (
  user_id,
  type,
  priority,
  title,
  message,
  icon,
  icon_color,
  link,
  data,
  read,
  created_at
) VALUES (
  'TU-USER-ID-AQUI',  -- ← CAMBIAR ESTO POR TU ID
  'sistema',
  'high',
  '🎉 Test de Notificación',
  'Si ves esto en tu app, ¡el sistema funciona! El problema es que chat.service no está llamando a notifyParticipants correctamente.',
  '🎉',
  'text-blue-500',
  '/internal/chat',
  '{"test": true, "timestamp": "2025-10-10"}'::jsonb,
  false,
  NOW()
);

-- PASO 4: Verificar que se insertó
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  created_at
FROM public.notificaciones
ORDER BY created_at DESC
LIMIT 1;

-- PASO 5: Ver todas las notificaciones
SELECT * FROM public.notificaciones;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Si el INSERT funciona:
--   ✅ La app debe mostrar toast inmediatamente
--   ✅ Badge debe mostrar (1)
--   ✅ Panel debe tener la notificación
--
-- Si el INSERT da error:
--   ❌ Hay problema con la tabla
--   → Ejecutar notificaciones_schema.sql completo
-- ============================================
