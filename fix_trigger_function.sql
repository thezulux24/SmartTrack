-- Función corregida para actualizar totales de hojas de gasto
-- Esta función debe ejecutarse en Supabase para reemplazar la función existente

CREATE OR REPLACE FUNCTION update_hoja_gasto_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.hojas_gasto SET
    total_productos = COALESCE((
      SELECT SUM(precio_total) 
      FROM public.hoja_gasto_items 
      WHERE hoja_gasto_id = COALESCE(NEW.hoja_gasto_id, OLD.hoja_gasto_id) 
      AND categoria = 'productos'
    ), 0),
    total_transporte = COALESCE((
      SELECT SUM(precio_total) 
      FROM public.hoja_gasto_items 
      WHERE hoja_gasto_id = COALESCE(NEW.hoja_gasto_id, OLD.hoja_gasto_id) 
      AND categoria = 'transporte'
    ), 0),
    total_otros = COALESCE((
      SELECT SUM(precio_total) 
      FROM public.hoja_gasto_items 
      WHERE hoja_gasto_id = COALESCE(NEW.hoja_gasto_id, OLD.hoja_gasto_id) 
      AND categoria = 'otros'
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.hoja_gasto_id, OLD.hoja_gasto_id);

  -- Actualizar total general (solo con las columnas que existen)
  UPDATE public.hojas_gasto SET
    total_general = total_productos + total_transporte + total_otros
  WHERE id = COALESCE(NEW.hoja_gasto_id, OLD.hoja_gasto_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger si es necesario
DROP TRIGGER IF EXISTS trigger_update_hoja_gasto_totals ON public.hoja_gasto_items;

CREATE TRIGGER trigger_update_hoja_gasto_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.hoja_gasto_items
  FOR EACH ROW
  EXECUTE FUNCTION update_hoja_gasto_totals();