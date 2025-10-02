-- Actualizar constraint de estados de kit para incluir todos los estados del flujo
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar constraint actual
ALTER TABLE public.kits_cirugia
DROP CONSTRAINT IF EXISTS kits_cirugia_estado_check;

-- 2. Agregar nuevo constraint con TODOS los estados del flujo
ALTER TABLE public.kits_cirugia
ADD CONSTRAINT kits_cirugia_estado_check 
CHECK (estado::text = ANY (ARRAY[
  'solicitado'::character varying,      -- Comercial solicita el kit
  'preparando'::character varying,      -- Logística está preparando
  'listo_envio'::character varying,     -- Listo para enviar
  'en_transito'::character varying,     -- En camino al hospital
  'entregado'::character varying,       -- Entregado y validado
  'en_uso'::character varying,          -- En uso durante cirugía
  'devuelto'::character varying,        -- Devuelto a logística
  'finalizado'::character varying,      -- Proceso completo
  'cancelado'::character varying        -- Cancelado
]::text[]));

-- 3. Verificar que se creó correctamente
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.kits_cirugia'::regclass
  AND conname = 'kits_cirugia_estado_check';

-- 4. Ver estados actuales en la tabla (opcional)
SELECT DISTINCT estado, COUNT(*) as cantidad
FROM public.kits_cirugia
GROUP BY estado
ORDER BY estado;
