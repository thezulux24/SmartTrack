-- Agregar el estado 'validado' al constraint de kits_cirugia
ALTER TABLE public.kits_cirugia 
DROP CONSTRAINT kits_cirugia_estado_check;

ALTER TABLE public.kits_cirugia 
ADD CONSTRAINT kits_cirugia_estado_check 
CHECK (estado::text = ANY (ARRAY[
  'solicitado'::character varying::text,
  'preparando'::character varying::text,
  'listo_envio'::character varying::text,
  'en_transito'::character varying::text,
  'entregado'::character varying::text,
  'validado'::character varying::text,
  'en_uso'::character varying::text,
  'devuelto'::character varying::text,
  'finalizado'::character varying::text,
  'cancelado'::character varying::text
]));
