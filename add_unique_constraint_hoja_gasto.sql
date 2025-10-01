-- Agregar constraint único para prevenir múltiples hojas de gasto por cirugía
-- Ejecutar esto en Supabase SQL Editor

-- Primero, eliminar hojas duplicadas si existen (opcional)
-- ADVERTENCIA: Esto eliminará hojas duplicadas, dejando solo la más reciente por cirugía
-- Comenta esta sección si no quieres eliminar las duplicadas existentes

/*
DELETE FROM public.hojas_gasto
WHERE id NOT IN (
  SELECT DISTINCT ON (cirugia_id) id
  FROM public.hojas_gasto
  ORDER BY cirugia_id, created_at DESC
);
*/

-- Agregar constraint único para prevenir duplicados en el futuro
ALTER TABLE public.hojas_gasto
ADD CONSTRAINT hojas_gasto_cirugia_id_unique UNIQUE (cirugia_id);

-- Verificar que el constraint se creó correctamente
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.hojas_gasto'::regclass
  AND conname = 'hojas_gasto_cirugia_id_unique';
