-- ═══════════════════════════════════════════════════════════════════
-- CORRECCIÓN: Eliminar IVA de calculate_cotizacion_totals
-- Fecha: 2025-10-13
-- Descripción: Reemplaza la función existente para que NO incluya IVA
-- ═══════════════════════════════════════════════════════════════════

-- 1. Ver el código actual de la función (para referencia)
SELECT 
  '📜 CÓDIGO ACTUAL:' AS info,
  pg_get_functiondef(p.oid) AS codigo_actual
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'calculate_cotizacion_totals';

-- 2. Reemplazar la función SIN IVA
CREATE OR REPLACE FUNCTION calculate_cotizacion_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_cotizacion_id UUID;
  v_subtotal NUMERIC := 0;
  v_costo_transporte NUMERIC := 0;
  v_descuento NUMERIC := 0;
  v_porcentaje_descuento NUMERIC := 0;
BEGIN
  -- Obtener el ID de la cotización
  IF TG_OP = 'DELETE' THEN
    v_cotizacion_id := OLD.cotizacion_id;
  ELSE
    v_cotizacion_id := NEW.cotizacion_id;
  END IF;

  -- Calcular subtotal sumando todos los items
  SELECT COALESCE(SUM(precio_total), 0)
  INTO v_subtotal
  FROM cotizacion_items
  WHERE cotizacion_id = v_cotizacion_id;

  -- Obtener costo de transporte, descuento y porcentaje de descuento
  SELECT 
    COALESCE(costo_transporte, 0),
    COALESCE(descuento, 0),
    COALESCE(porcentaje_descuento, 0)
  INTO v_costo_transporte, v_descuento, v_porcentaje_descuento
  FROM cotizaciones
  WHERE id = v_cotizacion_id;

  -- Si hay porcentaje de descuento, calcularlo sobre el subtotal
  IF v_porcentaje_descuento > 0 THEN
    v_descuento := v_subtotal * (v_porcentaje_descuento / 100);
  END IF;

  -- Actualizar cotización SIN IVA
  -- FÓRMULA: Total = Subtotal + Transporte - Descuento
  UPDATE cotizaciones
  SET 
    subtotal = v_subtotal,
    descuento = v_descuento,
    iva = 0,  -- ⭐ SIEMPRE CERO - SIN IVA
    total = v_subtotal + v_costo_transporte - v_descuento,
    updated_at = NOW()
  WHERE id = v_cotizacion_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Asegurar que el trigger existe
DROP TRIGGER IF EXISTS trigger_calculate_cotizacion_totals ON cotizacion_items;

CREATE TRIGGER trigger_calculate_cotizacion_totals
  AFTER INSERT OR UPDATE OR DELETE ON cotizacion_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cotizacion_totals();

-- 4. Crear trigger adicional para recalcular cuando cambien costos/descuentos
DROP TRIGGER IF EXISTS trigger_recalculate_on_costs_change ON cotizaciones;

CREATE OR REPLACE FUNCTION recalculate_on_costs_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo recalcular si cambiaron costos o descuentos
  IF OLD.costo_transporte IS DISTINCT FROM NEW.costo_transporte OR 
     OLD.descuento IS DISTINCT FROM NEW.descuento OR
     OLD.porcentaje_descuento IS DISTINCT FROM NEW.porcentaje_descuento THEN
    
    -- Si hay porcentaje de descuento, calcularlo sobre el subtotal
    IF NEW.porcentaje_descuento > 0 THEN
      NEW.descuento := NEW.subtotal * (NEW.porcentaje_descuento / 100);
    END IF;
    
    -- Recalcular total SIN IVA
    -- FÓRMULA: Total = Subtotal + Transporte - Descuento
    NEW.iva := 0;  -- ⭐ SIEMPRE CERO - SIN IVA
    NEW.total := NEW.subtotal + NEW.costo_transporte - NEW.descuento;
    NEW.updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_on_costs_change
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_on_costs_change();

-- 5. Actualizar todas las cotizaciones existentes para eliminar IVA
UPDATE cotizaciones
SET 
  iva = 0,
  total = subtotal + costo_transporte - descuento,
  updated_at = NOW()
WHERE iva != 0 OR total != (subtotal + costo_transporte - descuento);

-- 6. Verificación: Mostrar cotizaciones actualizadas
SELECT 
  numero_cotizacion AS "Número",
  subtotal AS "Subtotal",
  costo_transporte AS "Transporte",
  descuento AS "Descuento",
  iva AS "IVA (debe ser 0)",
  total AS "Total",
  CASE 
    WHEN iva = 0 AND total = (subtotal + costo_transporte - descuento) 
    THEN '✅ CORRECTO'
    ELSE '❌ ERROR'
  END AS "Estado"
FROM cotizaciones
ORDER BY created_at DESC
LIMIT 10;

-- Mensaje de éxito
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM cotizaciones WHERE iva = 0;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ IVA ELIMINADO DE COTIZACIONES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Cotizaciones actualizadas: %', v_count;
  RAISE NOTICE '📐 Fórmula aplicada: Total = Subtotal + Transporte - Descuento';
  RAISE NOTICE '🚫 IVA = 0 (sin impuesto)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Triggers actualizados:';
  RAISE NOTICE '   - trigger_calculate_cotizacion_totals (EN cotizacion_items)';
  RAISE NOTICE '   - trigger_recalculate_on_costs_change (EN cotizaciones) ⭐ NUEVO';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Todas las cotizaciones futuras se crearán SIN IVA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
