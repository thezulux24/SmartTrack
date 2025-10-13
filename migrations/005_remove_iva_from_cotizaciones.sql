-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Eliminar IVA de cotizaciones
-- Fecha: 2025-10-13
-- Descripción: Asegura que el IVA NO se incluya en los cálculos de cotizaciones
-- ═══════════════════════════════════════════════════════════════════

-- 1. Actualizar todas las cotizaciones existentes para eliminar IVA
UPDATE cotizaciones
SET 
  iva = 0,
  total = subtotal + costo_transporte - descuento
WHERE iva != 0;

-- 2. Eliminar y recrear el trigger de cálculo de totales SIN IVA
DROP TRIGGER IF EXISTS trg_calculate_cotizacion_totals ON cotizacion_items;
DROP FUNCTION IF EXISTS calculate_cotizacion_totals();

-- 3. Crear función de cálculo de totales SIN IVA
CREATE OR REPLACE FUNCTION calculate_cotizacion_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_cotizacion_id UUID;
  v_subtotal NUMERIC := 0;
  v_costo_transporte NUMERIC := 0;
  v_descuento NUMERIC := 0;
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

  -- Obtener costo de transporte y descuento
  SELECT 
    COALESCE(costo_transporte, 0),
    COALESCE(descuento, 0)
  INTO v_costo_transporte, v_descuento
  FROM cotizaciones
  WHERE id = v_cotizacion_id;

  -- Actualizar cotización SIN IVA
  UPDATE cotizaciones
  SET 
    subtotal = v_subtotal,
    iva = 0,  -- SIEMPRE 0
    total = v_subtotal + v_costo_transporte - v_descuento,
    updated_at = NOW()
  WHERE id = v_cotizacion_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger
CREATE TRIGGER trg_calculate_cotizacion_totals
  AFTER INSERT OR UPDATE OR DELETE ON cotizacion_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cotizacion_totals();

-- 5. Crear trigger para recalcular cuando cambia el transporte o descuento
DROP TRIGGER IF EXISTS trg_recalculate_on_costs_change ON cotizaciones;

CREATE OR REPLACE FUNCTION recalculate_on_costs_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo recalcular si cambiaron costos o descuentos
  IF OLD.costo_transporte != NEW.costo_transporte OR 
     OLD.descuento != NEW.descuento OR
     OLD.porcentaje_descuento != NEW.porcentaje_descuento THEN
    
    -- Calcular descuento si es por porcentaje
    IF NEW.porcentaje_descuento > 0 THEN
      NEW.descuento := NEW.subtotal * (NEW.porcentaje_descuento / 100);
    END IF;
    
    -- Recalcular total SIN IVA
    NEW.iva := 0;  -- SIEMPRE 0
    NEW.total := NEW.subtotal + NEW.costo_transporte - NEW.descuento;
    NEW.updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_on_costs_change
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_on_costs_change();

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ IVA eliminado de cotizaciones';
  RAISE NOTICE '📊 Fórmula: Total = Subtotal + Transporte - Descuento';
  RAISE NOTICE '🚫 IVA = 0 (sin impuesto)';
END $$;
