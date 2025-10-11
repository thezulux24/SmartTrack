-- ============================================
-- SOLUCIÓN: RECREAR POLÍTICAS RLS
-- ============================================

-- 1. Eliminar todas las políticas existentes (si existen)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notificaciones;

-- 2. Habilitar RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICA DE SELECT: Los usuarios solo ven sus notificaciones
CREATE POLICY "Users can view their own notifications"
ON public.notificaciones
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. POLÍTICA DE INSERT: Permitir INSERT para usuarios autenticados
-- Permite que cualquier usuario autenticado inserte notificaciones
CREATE POLICY "Authenticated users can insert notifications"
ON public.notificaciones
FOR INSERT
TO authenticated
WITH CHECK (true); -- Permite cualquier INSERT de usuarios autenticados

-- 5. POLÍTICA DE UPDATE: Solo actualizar sus propias notificaciones
CREATE POLICY "Users can update their own notifications"
ON public.notificaciones
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. POLÍTICA DE DELETE: Solo eliminar sus propias notificaciones
CREATE POLICY "Users can delete their own notifications"
ON public.notificaciones
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- VERIFICACIÓN: Comprobar que las políticas se crearon
-- ============================================
SELECT 
  policyname,
  cmd,
  permissive,
  CASE 
    WHEN cmd = 'SELECT' AND qual = '(auth.uid() = user_id)'::text THEN '✅'
    WHEN cmd = 'INSERT' AND with_check = 'true'::text THEN '✅'
    WHEN cmd = 'UPDATE' THEN '✅'
    WHEN cmd = 'DELETE' THEN '✅'
    ELSE '⚠️'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'notificaciones'
ORDER BY cmd;

-- ============================================
-- TEST FINAL: Probar INSERT
-- ============================================
-- Descomenta para probar:
/*
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
  auth.uid(),
  'sistema',
  'high',
  'Test RLS',
  'Si ves esto, el RLS funciona correctamente',
  '✅',
  'text-green-500',
  false
)
RETURNING *;
*/
