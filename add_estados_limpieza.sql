-- ============================================================================
-- MIGRACIÓN: Estados de Limpieza
-- Fecha: 2025-10-09
-- Descripción: Permite a logística registrar la recepción de productos limpios
-- ============================================================================

-- PASO 1: Agregar columnas a la tabla kit_productos_limpieza
ALTER TABLE kit_productos_limpieza
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'enviado_limpieza',
ADD COLUMN IF NOT EXISTS fecha_devuelto_limpio TIMESTAMP,
ADD COLUMN IF NOT EXISTS recibido_por_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS observaciones_recepcion TEXT;

-- PASO 2: Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_kit_productos_limpieza_estado 
ON kit_productos_limpieza(estado);

CREATE INDEX IF NOT EXISTS idx_kit_productos_limpieza_fecha_devuelto 
ON kit_productos_limpieza(fecha_devuelto_limpio);

-- PASO 3: Agregar comentarios para documentación
COMMENT ON COLUMN kit_productos_limpieza.estado IS 'Estados: enviado_limpieza, devuelto_limpio, en_inventario';
COMMENT ON COLUMN kit_productos_limpieza.fecha_devuelto_limpio IS 'Fecha en que logística confirma la llegada de productos limpios';
COMMENT ON COLUMN kit_productos_limpieza.recibido_por_id IS 'ID del usuario de logística que confirma la recepción';
COMMENT ON COLUMN kit_productos_limpieza.observaciones_recepcion IS 'Observaciones de logística al recibir los productos (daños, faltantes, etc.)';

-- PASO 4: Actualizar registros existentes al estado inicial
UPDATE kit_productos_limpieza
SET estado = 'enviado_limpieza'
WHERE estado IS NULL;

-- PASO 5: Verificar que todo se creó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'kit_productos_limpieza'
AND column_name IN ('estado', 'fecha_devuelto_limpio', 'recibido_por_id', 'observaciones_recepcion');

-- ✅ MIGRACIÓN COMPLETADA
-- Los nuevos campos están listos para usar en el flujo de recepción de limpieza
