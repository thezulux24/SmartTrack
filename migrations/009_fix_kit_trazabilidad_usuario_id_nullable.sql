-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Hacer usuario_id nullable en kit_trazabilidad
-- Fecha: 2025-01-XX
-- Descripción: Permitir registros de trazabilidad sin usuario autenticado
--              (para validaciones públicas vía QR)
-- ═══════════════════════════════════════════════════════════════════════════════

-- NOTA: Esta migración es OPCIONAL. El código ahora usa el tecnico_id del kit
--       o el mensajero_id como fallback, pero esta migración hace el sistema
--       más flexible para casos edge.

-- Hacer que usuario_id acepte NULL
ALTER TABLE kit_trazabilidad 
  ALTER COLUMN usuario_id DROP NOT NULL;

-- Agregar un comentario explicativo
COMMENT ON COLUMN kit_trazabilidad.usuario_id IS 
  'ID del usuario que realizó la acción. Puede ser NULL para acciones del sistema o validaciones públicas (QR).';

-- Verificación
SELECT 
  column_name, 
  is_nullable, 
  data_type
FROM information_schema.columns
WHERE table_name = 'kit_trazabilidad' 
  AND column_name = 'usuario_id';
