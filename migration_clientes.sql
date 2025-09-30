-- Migración completa para eliminar campos legacy de paciente
-- y usar únicamente la tabla clientes con cliente_id

-- PASO 1: Eliminar todos los registros de cirugías existentes
-- (para empezar limpio con el nuevo sistema)
DELETE FROM public.cirugia_seguimiento;
DELETE FROM public.cirugia_productos;
DELETE FROM public.kit_trazabilidad;
DELETE FROM public.kit_productos;
DELETE FROM public.kits_cirugia;
DELETE FROM public.cirugias;

-- PASO 2: Eliminar los campos legacy de paciente que ya no se usan
ALTER TABLE public.cirugias DROP COLUMN IF EXISTS paciente_nombre;
ALTER TABLE public.cirugias DROP COLUMN IF EXISTS paciente_documento;
ALTER TABLE public.cirugias DROP COLUMN IF EXISTS paciente_telefono;

-- PASO 3: Hacer que cliente_id sea obligatorio (NOT NULL)
-- ya que ahora es la única forma de identificar al cliente
ALTER TABLE public.cirugias ALTER COLUMN cliente_id SET NOT NULL;

-- PASO 4: Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_cirugias_cliente_id ON public.cirugias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_documento_numero ON public.clientes(documento_numero);

-- PASO 5: Verificar que la constraint FK esté presente
-- (debería existir ya según el schema original)
-- ALTER TABLE public.cirugias 
-- ADD CONSTRAINT cirugias_cliente_id_fkey 
-- FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);