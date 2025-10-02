-- Script para actualizar kits existentes de 'preparando' a 'solicitado'
-- Esto permite que los kits creados antes del cambio aparezcan en la lista de pendientes

-- 1. Actualizar el estado de los kits que están en 'preparando' a 'solicitado'
UPDATE kits_cirugia 
SET estado = 'solicitado'
WHERE estado = 'preparando';

-- 2. Registrar en la trazabilidad el cambio (opcional, para auditoría)
INSERT INTO kit_trazabilidad (kit_id, usuario_id, accion, estado_anterior, estado_nuevo, observaciones)
SELECT 
  id as kit_id,
  comercial_id as usuario_id,
  'estado_corregido' as accion,
  'preparando' as estado_anterior,
  'solicitado' as estado_nuevo,
  'Corrección de estado inicial - Kit debe ser aprobado por logística' as observaciones
FROM kits_cirugia 
WHERE estado = 'solicitado' 
  AND id NOT IN (
    SELECT DISTINCT kit_id 
    FROM kit_trazabilidad 
    WHERE accion = 'estado_corregido'
  );

-- 3. Verificar los kits actualizados
SELECT 
  k.numero_kit,
  k.estado,
  k.created_at,
  c.numero_cirugia,
  c.fecha_programada,
  p.nombre || ' ' || p.apellido as comercial
FROM kits_cirugia k
LEFT JOIN cirugias c ON k.cirugia_id = c.id
LEFT JOIN profiles p ON k.comercial_id = p.id
WHERE k.estado = 'solicitado'
ORDER BY k.created_at DESC;
