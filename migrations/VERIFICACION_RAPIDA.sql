-- ═══════════════════════════════════════════════════════════════════
-- VERIFICACIÓN RÁPIDA: ¿Están los triggers de cotizaciones?
-- Copia y pega esto en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. ¿Cuántos triggers de cotizaciones hay?
SELECT 
  COUNT(*) AS "Total Triggers de Cotizaciones"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname LIKE '%cotizacion%';

-- 2. Listar triggers de cotizaciones
SELECT 
  t.tgname AS "Trigger",
  c.relname AS "Tabla",
  CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END AS "Timing",
  p.proname AS "Función"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname LIKE '%cotizacion%'
ORDER BY c.relname, t.tgname;

-- 3. ¿Existe el trigger de cálculo de totales?
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ SÍ EXISTE'
    ELSE '❌ NO EXISTE - Ejecutar migraciones'
  END AS "Trigger de Totales"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'cotizacion_items'
  AND t.tgname LIKE '%calculate%total%';

-- 4. Ver código de la función de totales (buscar si tiene IVA)
SELECT pg_get_functiondef(p.oid) AS "Código de calculate_cotizacion_totals"
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'calculate_cotizacion_totals';

-- 5. ¿El código incluye IVA? (buscar en el resultado anterior)
-- Busca: "iva = 0" → ✅ CORRECTO
-- Busca: "iva = v_subtotal * 0.19" → ❌ INCORRECTO
