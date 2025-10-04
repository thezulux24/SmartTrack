-- Crear tabla cirugia_trazabilidad (espejo de kit_trazabilidad para cirugías)
CREATE TABLE IF NOT EXISTS public.cirugia_trazabilidad (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cirugia_id uuid NOT NULL,
  accion character varying NOT NULL,
  estado_anterior character varying,
  estado_nuevo character varying NOT NULL,
  usuario_id uuid NOT NULL,
  ubicacion character varying,
  coordenadas_lat numeric,
  coordenadas_lng numeric,
  timestamp timestamp with time zone DEFAULT now(),
  observaciones text,
  metadata jsonb,
  CONSTRAINT cirugia_trazabilidad_pkey PRIMARY KEY (id),
  CONSTRAINT cirugia_trazabilidad_cirugia_id_fkey FOREIGN KEY (cirugia_id) REFERENCES public.cirugias(id) ON DELETE CASCADE,
  CONSTRAINT cirugia_trazabilidad_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cirugia_trazabilidad_cirugia_id ON public.cirugia_trazabilidad(cirugia_id);
CREATE INDEX IF NOT EXISTS idx_cirugia_trazabilidad_timestamp ON public.cirugia_trazabilidad(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cirugia_trazabilidad_usuario_id ON public.cirugia_trazabilidad(usuario_id);

-- Comentarios
COMMENT ON TABLE public.cirugia_trazabilidad IS 'Trazabilidad completa de cirugías - Registro de todos los cambios de estado y acciones importantes';
COMMENT ON COLUMN public.cirugia_trazabilidad.accion IS 'Tipo de acción: cirugia_creada, estado_cambiado, kit_asignado, tecnico_asignado, etc';
COMMENT ON COLUMN public.cirugia_trazabilidad.metadata IS 'Información adicional en formato JSON (cambios de campos, documentos adjuntos, etc)';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.cirugia_trazabilidad ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden ver trazabilidad
CREATE POLICY "Usuarios autenticados pueden ver trazabilidad de cirugías"
  ON public.cirugia_trazabilidad
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo usuarios internos pueden insertar trazabilidad
CREATE POLICY "Usuarios internos pueden insertar trazabilidad"
  ON public.cirugia_trazabilidad
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('comercial', 'soporte_tecnico', 'logistica', 'admin')
    )
  );

-- Vista consolidada de trazabilidad (cirugía + kits)
CREATE OR REPLACE VIEW public.trazabilidad_completa AS
SELECT 
  'cirugia' as tipo_entidad,
  ct.cirugia_id as referencia_id,
  c.numero_cirugia as referencia_numero,
  ct.accion,
  ct.estado_anterior,
  ct.estado_nuevo,
  ct.timestamp,
  ct.observaciones,
  ct.usuario_id,
  p.full_name as usuario_nombre,
  p.role as usuario_rol,
  ct.ubicacion,
  ct.metadata
FROM public.cirugia_trazabilidad ct
JOIN public.cirugias c ON ct.cirugia_id = c.id
LEFT JOIN public.profiles p ON ct.usuario_id = p.id

UNION ALL

SELECT 
  'kit' as tipo_entidad,
  kt.kit_id as referencia_id,
  k.numero_kit as referencia_numero,
  kt.accion,
  kt.estado_anterior,
  kt.estado_nuevo,
  kt.timestamp,
  kt.observaciones,
  kt.usuario_id,
  p.full_name as usuario_nombre,
  p.role as usuario_rol,
  kt.ubicacion,
  kt.metadata
FROM public.kit_trazabilidad kt
JOIN public.kits_cirugia k ON kt.kit_id = k.id
LEFT JOIN public.profiles p ON kt.usuario_id = p.id

ORDER BY timestamp DESC;

-- Comentario en la vista
COMMENT ON VIEW public.trazabilidad_completa IS 'Vista unificada de trazabilidad de cirugías y kits';
