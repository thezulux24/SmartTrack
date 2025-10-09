-- FASE 5: Devolución y Limpieza - Actualización de Schema
-- Agregar columnas necesarias para el proceso de devolución y limpieza

-- 1. Actualizar tabla kit_productos con campos de recuperación
ALTER TABLE public.kit_productos
ADD COLUMN IF NOT EXISTS cantidad_recuperable INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS es_desechable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notas_devolucion TEXT;

-- 2. Actualizar tabla kits_cirugia con campos de limpieza
ALTER TABLE public.kits_cirugia
ADD COLUMN IF NOT EXISTS fecha_inicio_limpieza TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fecha_fin_limpieza TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS limpieza_aprobada_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fecha_aprobacion_limpieza TIMESTAMP WITH TIME ZONE;

-- 3. Agregar estado 'en_limpieza' al CHECK constraint de kits_cirugia
ALTER TABLE public.kits_cirugia DROP CONSTRAINT IF EXISTS kits_cirugia_estado_check;
ALTER TABLE public.kits_cirugia 
ADD CONSTRAINT kits_cirugia_estado_check 
CHECK (estado::text = ANY (ARRAY[
  'solicitado'::text, 
  'preparando'::text, 
  'listo_envio'::text, 
  'en_transito'::text, 
  'entregado'::text, 
  'validado'::text, 
  'en_uso'::text, 
  'devuelto'::text, 
  'en_limpieza'::text, 
  'finalizado'::text, 
  'cancelado'::text
]));

-- 4. Crear tabla para tracking detallado del proceso de limpieza (opcional pero recomendado)
CREATE TABLE IF NOT EXISTS public.kit_productos_limpieza (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_producto_id UUID NOT NULL REFERENCES public.kit_productos(id) ON DELETE CASCADE,
  kit_id UUID NOT NULL REFERENCES public.kits_cirugia(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES public.productos(id),
  
  -- Estado del proceso de limpieza
  estado_limpieza TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_limpieza IN (
    'pendiente',      -- Esperando proceso de limpieza
    'en_proceso',     -- En proceso de limpieza/esterilización
    'esterilizado',   -- Esterilizado y listo para aprobación
    'aprobado',       -- Aprobado por supervisor
    'desechado'       -- Marcado como desechable
  )),
  
  -- Cantidades
  cantidad_a_recuperar INTEGER NOT NULL DEFAULT 0,
  cantidad_aprobada INTEGER DEFAULT 0,
  
  -- Clasificación
  es_desechable BOOLEAN DEFAULT false,
  
  -- Notas y observaciones
  notas TEXT,
  observaciones_limpieza TEXT,
  
  -- Metadata del proceso
  procesado_por UUID REFERENCES auth.users(id),
  fecha_inicio_proceso TIMESTAMP WITH TIME ZONE,
  fecha_fin_proceso TIMESTAMP WITH TIME ZONE,
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_kit_productos_limpieza_kit_id ON public.kit_productos_limpieza(kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_productos_limpieza_estado ON public.kit_productos_limpieza(estado_limpieza);
CREATE INDEX IF NOT EXISTS idx_kits_cirugia_en_limpieza ON public.kits_cirugia(estado) WHERE estado = 'en_limpieza';

-- 6. Agregar comentarios para documentación
COMMENT ON COLUMN public.kit_productos.cantidad_recuperable IS 'Cantidad de productos que pueden ser recuperados y reutilizados después de limpieza';
COMMENT ON COLUMN public.kit_productos.es_desechable IS 'Indica si el producto fue marcado como desechable y no retornará al inventario';
COMMENT ON COLUMN public.kit_productos.notas_devolucion IS 'Notas del técnico durante el proceso de devolución';

COMMENT ON TABLE public.kit_productos_limpieza IS 'Tracking detallado del proceso de limpieza y esterilización de productos devueltos';
COMMENT ON COLUMN public.kit_productos_limpieza.estado_limpieza IS 'Estado actual del producto en el proceso de limpieza: pendiente → en_proceso → esterilizado → aprobado';

-- 7. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_kit_productos_limpieza_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_kit_productos_limpieza_updated_at ON public.kit_productos_limpieza;
CREATE TRIGGER trigger_update_kit_productos_limpieza_updated_at
  BEFORE UPDATE ON public.kit_productos_limpieza
  FOR EACH ROW
  EXECUTE FUNCTION update_kit_productos_limpieza_updated_at();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Schema actualizado exitosamente para FASE 5 - Devolución y Limpieza';
  RAISE NOTICE 'Estados de kit ahora incluyen: en_limpieza';
  RAISE NOTICE 'Tabla kit_productos_limpieza creada para tracking detallado';
END $$;
