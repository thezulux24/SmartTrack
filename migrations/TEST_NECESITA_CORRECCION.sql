-- ════════════════════════════════════════════════════════════════════════════════
-- TEST RÁPIDO: ¿Necesito ejecutar la corrección de IVA?
-- Copia SOLO las líneas que necesites y pégalas en Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════════

-- TEST 1: ¿La función calcula IVA? (debe retornar FALSE)
SELECT 
  pg_get_functiondef(p.oid) LIKE '%iva = v_subtotal%' OR
  pg_get_functiondef(p.oid) LIKE '%iva = %0.19%' OR
  pg_get_functiondef(p.oid) LIKE '%iva = %0.12%' AS "❌ ¿Calcula IVA?"
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'calculate_cotizacion_totals';
-- Si retorna TRUE → Ejecutar 006_fix_iva_en_calculate_totals.sql
-- Si retorna FALSE → Ya está correcto

-- TEST 2: ¿Hay cotizaciones con IVA != 0? (debe retornar 0)
SELECT COUNT(*) AS "❌ Cotizaciones con IVA" 
FROM cotizaciones 
WHERE iva != 0;
-- Si retorna > 0 → Ejecutar 006_fix_iva_en_calculate_totals.sql
-- Si retorna 0 → Ya está correcto

-- TEST 3: ¿Las últimas 3 cotizaciones están correctas?
SELECT 
  numero_cotizacion,
  iva AS "IVA (debe ser 0)",
  CASE WHEN iva = 0 THEN '✅' ELSE '❌' END AS "OK"
FROM cotizaciones 
ORDER BY created_at DESC 
LIMIT 3;
-- Si todas muestran ✅ → Ya está correcto
-- Si alguna muestra ❌ → Ejecutar 006_fix_iva_en_calculate_totals.sql

-- TEST 4: Verificación completa (debe retornar '✅ TODO OK')
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM cotizaciones WHERE iva != 0) 
    THEN '✅ TODO OK - No necesitas corrección'
    ELSE '❌ PROBLEMA - Ejecutar 006_fix_iva_en_calculate_totals.sql'
  END AS "Estado";
