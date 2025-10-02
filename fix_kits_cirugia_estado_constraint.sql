-- Fix for kits_cirugia_estado_check constraint violation
-- Step 1: Check current estado values in the table
SELECT DISTINCT estado, COUNT(*) as cantidad
FROM public.kits_cirugia
GROUP BY estado
ORDER BY estado;

-- Step 2: Drop the existing CHECK constraint
ALTER TABLE public.kits_cirugia
DROP CONSTRAINT IF EXISTS kits_cirugia_estado_check;

-- Step 3: Update any invalid estado values to 'preparando' (or choose appropriate default)
-- First, let's see if there are any NULL or unexpected values
SELECT id, numero_kit, estado
FROM public.kits_cirugia
WHERE estado IS NULL OR estado NOT IN (
  'solicitado',
  'preparando', 
  'listo_envio',
  'en_transito',
  'entregado',
  'en_uso',
  'devuelto',
  'finalizado',
  'cancelado'
);

-- Step 4: Update NULL or invalid estado values
UPDATE public.kits_cirugia
SET estado = 'preparando'
WHERE estado IS NULL;

-- Step 5: Recreate the CHECK constraint with proper allowed values
-- Based on the 7-phase business flow, these are the logical estados:
ALTER TABLE public.kits_cirugia
ADD CONSTRAINT kits_cirugia_estado_check 
CHECK (estado IN (
  'solicitado',      -- FASE 1: Kit solicitado por comercial
  'preparando',      -- FASE 2: Logística preparando el kit
  'listo_envio',     -- FASE 2: Kit listo para enviar
  'en_transito',     -- FASE 3: Kit en camino al cliente/hospital
  'entregado',       -- FASE 3: Kit entregado y validado por cliente
  'en_uso',          -- FASE 4: Kit en uso durante cirugía
  'devuelto',        -- FASE 5-6: Kit devuelto a logística
  'finalizado',      -- FASE 7: Proceso completo, listo para facturación
  'cancelado'        -- Cualquier fase: Kit/cirugía cancelada
));

-- Step 6: Verify the constraint was added successfully
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.kits_cirugia'::regclass
  AND conname = 'kits_cirugia_estado_check';
