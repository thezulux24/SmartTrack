-- ============================================
-- SOLUCIÓN ALTERNATIVA: RLS MÁS PERMISIVO
-- ============================================
-- Usar esto solo si fix_rls_notificaciones.sql no funciona

-- 1. DESHABILITAR RLS temporalmente para debugging
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;

-- 2. Probar INSERT sin RLS
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
  'Test SIN RLS',
  'Si ves esto, el problema ERA el RLS',
  '✅',
  'text-green-500',
  false
)
RETURNING *;
*/

-- 3. Si el INSERT funciona sin RLS, entonces volver a habilitar con políticas corregidas:
/*
-- Habilitar RLS nuevamente
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Crear política super permisiva para INSERT
CREATE POLICY "Allow all inserts"
ON public.notificaciones
FOR INSERT
TO authenticated, anon -- Permite tanto authenticated como anon
WITH CHECK (true);

-- Crear política para SELECT
CREATE POLICY "Allow select own notifications"
ON public.notificaciones
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Crear política para UPDATE
CREATE POLICY "Allow update own notifications"
ON public.notificaciones
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Crear política para DELETE
CREATE POLICY "Allow delete own notifications"
ON public.notificaciones
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
*/
