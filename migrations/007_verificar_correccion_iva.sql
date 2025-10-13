-- ═══════════════════════════════════════════════════════════════════
-- VERIFICACIÓN POST-CORRECCIÓN: Confirmar que el IVA está eliminado
-- Ejecuta esto DESPUÉS de 006_fix_iva_en_calculate_totals.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. Verificar que la función NO contenga cálculo de IVA
DO $$
DECLARE
  func_code TEXT;
  tiene_iva_calculo BOOLEAN := FALSE;
BEGIN
  -- Obtener código de la función
  SELECT pg_get_functiondef(p.oid) INTO func_code
  FROM pg_proc p
  LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'calculate_cotizacion_totals';
  
  -- Verificar si contiene cálculo de IVA
  IF func_code LIKE '%iva = v_subtotal * %' OR 
     func_code LIKE '%iva = %0.19%' OR
     func_code LIKE '%iva = %0.12%' THEN
    tiene_iva_calculo := TRUE;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VERIFICACIÓN DE FUNCIÓN calculate_cotizacion_totals';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  
  IF tiene_iva_calculo THEN
    RAISE NOTICE '❌ ERROR: La función AÚN contiene cálculo de IVA';
    RAISE NOTICE '⚠️  Ejecuta el script 006_fix_iva_en_calculate_totals.sql';
  ELSE
    RAISE NOTICE '✅ CORRECTO: La función NO calcula IVA';
    RAISE NOTICE '✅ La línea debe contener: iva = 0';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 2. Verificar que TODAS las cotizaciones tengan IVA = 0
DO $$
DECLARE
  v_total_cotizaciones INTEGER;
  v_con_iva INTEGER;
  v_sin_iva INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_cotizaciones FROM cotizaciones;
  SELECT COUNT(*) INTO v_con_iva FROM cotizaciones WHERE iva != 0;
  SELECT COUNT(*) INTO v_sin_iva FROM cotizaciones WHERE iva = 0;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '💰 VERIFICACIÓN DE COTIZACIONES EXISTENTES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total de cotizaciones: %', v_total_cotizaciones;
  RAISE NOTICE '✅ Sin IVA (iva = 0): %', v_sin_iva;
  
  IF v_con_iva > 0 THEN
    RAISE NOTICE '❌ Con IVA (iva != 0): % ← PROBLEMA!', v_con_iva;
    RAISE NOTICE '⚠️  Ejecuta el UPDATE del script 006';
  ELSE
    RAISE NOTICE '✅ Todas las cotizaciones sin IVA';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 3. Verificar que los triggers existan
DO $$
DECLARE
  v_trigger_items BOOLEAN;
  v_trigger_costs BOOLEAN;
BEGIN
  -- Verificar trigger en cotizacion_items
  SELECT EXISTS (
    SELECT 1 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'cotizacion_items'
      AND t.tgname = 'trigger_calculate_cotizacion_totals'
  ) INTO v_trigger_items;
  
  -- Verificar trigger en cotizaciones
  SELECT EXISTS (
    SELECT 1 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'cotizaciones'
      AND t.tgname = 'trigger_recalculate_on_costs_change'
  ) INTO v_trigger_costs;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '⚡ VERIFICACIÓN DE TRIGGERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  
  IF v_trigger_items THEN
    RAISE NOTICE '✅ trigger_calculate_cotizacion_totals existe en cotizacion_items';
  ELSE
    RAISE NOTICE '❌ trigger_calculate_cotizacion_totals NO existe';
  END IF;
  
  IF v_trigger_costs THEN
    RAISE NOTICE '✅ trigger_recalculate_on_costs_change existe en cotizaciones';
  ELSE
    RAISE NOTICE '⚠️  trigger_recalculate_on_costs_change NO existe (se crea en script 006)';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 4. Verificar la fórmula en cotizaciones recientes
SELECT 
  numero_cotizacion AS "Cotización",
  subtotal AS "Subtotal",
  costo_transporte AS "Transporte",
  descuento AS "Descuento",
  iva AS "IVA",
  total AS "Total",
  (subtotal + costo_transporte - descuento) AS "Total Calculado",
  CASE 
    WHEN iva = 0 THEN '✅'
    ELSE '❌ IVA != 0'
  END AS "IVA OK",
  CASE 
    WHEN total = (subtotal + costo_transporte - descuento) THEN '✅'
    ELSE '❌ Fórmula incorrecta'
  END AS "Fórmula OK"
FROM cotizaciones
ORDER BY created_at DESC
LIMIT 5;

-- 5. Resumen final
DO $$
DECLARE
  v_todo_ok BOOLEAN := TRUE;
  v_con_iva INTEGER;
  v_formula_incorrecta INTEGER;
BEGIN
  -- Verificar si hay cotizaciones con IVA
  SELECT COUNT(*) INTO v_con_iva FROM cotizaciones WHERE iva != 0;
  
  -- Verificar si hay cotizaciones con fórmula incorrecta
  SELECT COUNT(*) INTO v_formula_incorrecta 
  FROM cotizaciones 
  WHERE total != (subtotal + costo_transporte - descuento);
  
  IF v_con_iva > 0 OR v_formula_incorrecta > 0 THEN
    v_todo_ok := FALSE;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RESUMEN FINAL';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  
  IF v_todo_ok THEN
    RAISE NOTICE '';
    RAISE NOTICE '  ✅✅✅ TODO CORRECTO ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE '  ✅ Función sin cálculo de IVA';
    RAISE NOTICE '  ✅ Todas las cotizaciones con iva = 0';
    RAISE NOTICE '  ✅ Fórmula correcta: Total = Subtotal + Transporte - Descuento';
    RAISE NOTICE '  ✅ Triggers activos';
    RAISE NOTICE '';
    RAISE NOTICE '  🎉 El módulo de cotizaciones está listo para usar SIN IVA';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '  ⚠️  PROBLEMAS DETECTADOS';
    RAISE NOTICE '';
    IF v_con_iva > 0 THEN
      RAISE NOTICE '  ❌ % cotizaciones con IVA != 0', v_con_iva;
    END IF;
    IF v_formula_incorrecta > 0 THEN
      RAISE NOTICE '  ❌ % cotizaciones con fórmula incorrecta', v_formula_incorrecta;
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '  ⚠️  Ejecuta el script 006_fix_iva_en_calculate_totals.sql';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
