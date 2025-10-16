DROP TRIGGER IF EXISTS trigger_kit_status_change ON kits_cirugia;
DROP FUNCTION IF EXISTS notify_kit_status_change();

CREATE OR REPLACE FUNCTION notify_kit_status_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'kit_status_change',
    json_build_object(
      'kit_id', NEW.id,
      'cirugia_id', NEW.cirugia_id,
      'estado', NEW.estado,
      'logistica_id', NEW.logistica_id,
      'tecnico_id', NEW.tecnico_id,
      'fecha_actualizacion', NEW.updated_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kit_status_change
  AFTER UPDATE ON kits_cirugia
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
  EXECUTE FUNCTION notify_kit_status_change();
