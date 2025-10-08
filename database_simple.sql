-- ═══════════════════════════════════════════════════════════════════
-- SISTEMA DE MENSAJEROS Y ENVÍOS - SMARTTRACK (VERSIÓN SIMPLIFICADA)
-- Base de datos: PostgreSQL (Supabase)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- TABLA: mensajeros
-- Catálogo simple de mensajeros
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mensajeros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  placa VARCHAR(20),
  estado VARCHAR(20) NOT NULL DEFAULT 'disponible' 
    CHECK (estado IN ('disponible', 'ocupado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────
-- TABLA: envios
-- Registro simple de envíos de kits
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES kits_cirugia(id) ON DELETE RESTRICT,
  mensajero_id UUID NOT NULL REFERENCES mensajeros(id) ON DELETE RESTRICT,
  
  direccion_destino TEXT NOT NULL,
  contacto_destino VARCHAR(255),
  telefono_destino VARCHAR(20),
  
  fecha_programada DATE NOT NULL,
  hora_salida TIMESTAMP WITH TIME ZONE,
  hora_llegada TIMESTAMP WITH TIME ZONE,
  
  estado VARCHAR(20) NOT NULL DEFAULT 'programado'
    CHECK (estado IN ('programado', 'en_transito', 'entregado')),
  
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_envios_kit ON envios(kit_id);
CREATE INDEX IF NOT EXISTS idx_envios_mensajero ON envios(mensajero_id);
CREATE INDEX IF NOT EXISTS idx_envios_estado ON envios(estado);

-- ─────────────────────────────────────────────────────────────────
-- TRIGGER: Actualizar estado del mensajero
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION actualizar_estado_mensajero()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el envío pasa a en_transito, mensajero pasa a ocupado
  IF NEW.estado = 'en_transito' AND OLD.estado != 'en_transito' THEN
    UPDATE mensajeros SET estado = 'ocupado' WHERE id = NEW.mensajero_id;
  END IF;
  
  -- Si el envío se entrega, verificar si el mensajero tiene más envíos activos
  IF NEW.estado = 'entregado' AND OLD.estado != 'entregado' THEN
    IF NOT EXISTS (
      SELECT 1 FROM envios
      WHERE mensajero_id = NEW.mensajero_id
        AND estado IN ('programado', 'en_transito')
        AND id != NEW.id
    ) THEN
      UPDATE mensajeros SET estado = 'disponible' WHERE id = NEW.mensajero_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_estado_mensajero ON envios;
CREATE TRIGGER trg_actualizar_estado_mensajero
  AFTER UPDATE ON envios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_mensajero();

-- ─────────────────────────────────────────────────────────────────
-- DATOS DE PRUEBA
-- ─────────────────────────────────────────────────────────────────

INSERT INTO mensajeros (nombre, telefono, placa, estado) VALUES
('Carlos Mendoza', '3001234567', 'ABC123', 'disponible'),
('María Rodríguez', '3009876543', 'XYZ789', 'disponible'),
('Juan Pérez', '3112233445', 'QWE456', 'disponible')
ON CONFLICT DO NOTHING;
