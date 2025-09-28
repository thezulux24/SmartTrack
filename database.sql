-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agenda_tecnicos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tecnico_id uuid,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  disponible boolean DEFAULT true,
  motivo_no_disponible character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agenda_tecnicos_pkey PRIMARY KEY (id),
  CONSTRAINT agenda_tecnicos_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.cirugia_productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cirugia_id uuid,
  producto_id uuid,
  cantidad_requerida integer NOT NULL DEFAULT 1,
  cantidad_utilizada integer DEFAULT 0,
  es_implante boolean DEFAULT false,
  numero_lote character varying,
  fecha_vencimiento date,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cirugia_productos_pkey PRIMARY KEY (id),
  CONSTRAINT cirugia_productos_cirugia_id_fkey FOREIGN KEY (cirugia_id) REFERENCES public.cirugias(id),
  CONSTRAINT cirugia_productos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.cirugia_seguimiento (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cirugia_id uuid,
  estado_anterior character varying,
  estado_nuevo character varying NOT NULL,
  comentario text,
  usuario_id uuid NOT NULL,
  fecha_cambio timestamp with time zone DEFAULT now(),
  CONSTRAINT cirugia_seguimiento_pkey PRIMARY KEY (id),
  CONSTRAINT cirugia_seguimiento_cirugia_id_fkey FOREIGN KEY (cirugia_id) REFERENCES public.cirugias(id),
  CONSTRAINT cirugia_seguimiento_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.cirugias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_cirugia character varying NOT NULL UNIQUE,
  paciente_nombre character varying NOT NULL,
  paciente_documento character varying,
  paciente_telefono character varying,
  medico_cirujano character varying NOT NULL,
  fecha_programada timestamp with time zone NOT NULL,
  hora_inicio time without time zone,
  duracion_estimada integer,
  estado character varying DEFAULT 'programada'::character varying,
  prioridad character varying DEFAULT 'normal'::character varying,
  notas text,
  tecnico_asignado_id uuid,
  usuario_creador_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  hospital_id uuid NOT NULL,
  tipo_cirugia_id uuid NOT NULL,
  cliente_id uuid,
  CONSTRAINT cirugias_pkey PRIMARY KEY (id),
  CONSTRAINT cirugias_tecnico_asignado_id_fkey FOREIGN KEY (tecnico_asignado_id) REFERENCES public.profiles(id),
  CONSTRAINT cirugias_usuario_creador_id_fkey FOREIGN KEY (usuario_creador_id) REFERENCES public.profiles(id),
  CONSTRAINT cirugias_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitales(id),
  CONSTRAINT cirugias_tipo_cirugia_id_fkey FOREIGN KEY (tipo_cirugia_id) REFERENCES public.tipos_cirugia(id),
  CONSTRAINT cirugias_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);
CREATE TABLE public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  nombre character varying NOT NULL,
  apellido character varying NOT NULL,
  documento_tipo character varying NOT NULL DEFAULT 'cedula'::character varying,
  documento_numero character varying NOT NULL UNIQUE,
  fecha_nacimiento date,
  telefono character varying,
  email character varying,
  direccion text,
  ciudad character varying,
  pais character varying DEFAULT 'Ecuador'::character varying,
  observaciones text,
  estado character varying DEFAULT 'activo'::character varying,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT clientes_pkey PRIMARY KEY (id),
  CONSTRAINT clientes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT clientes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.hospitales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL,
  direccion text,
  telefono character varying,
  contacto_principal character varying,
  email character varying,
  ciudad character varying,
  es_activo boolean DEFAULT true,
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hospitales_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inventario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  producto_id uuid,
  cantidad integer NOT NULL DEFAULT 0,
  ubicacion character varying DEFAULT 'sede_principal'::character varying,
  estado character varying DEFAULT 'disponible'::character varying,
  fecha_vencimiento date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventario_pkey PRIMARY KEY (id),
  CONSTRAINT inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.movimientos_inventario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventario_id uuid,
  producto_id uuid,
  tipo character varying NOT NULL,
  cantidad integer NOT NULL,
  motivo character varying,
  usuario_id uuid NOT NULL,
  fecha timestamp with time zone DEFAULT now(),
  ubicacion_origen character varying,
  ubicacion_destino character varying,
  observaciones text,
  referencia character varying,
  lote character varying,
  fecha_vencimiento date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_inventario_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id),
  CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  categoria character varying NOT NULL,
  precio numeric,
  stock_minimo integer DEFAULT 5,
  es_activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  unidad_medida character varying DEFAULT 'unidad'::character varying,
  descripcion text,
  proveedor character varying,
  ubicacion_principal character varying DEFAULT 'sede_principal_norte'::character varying,
  notas text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  email text,
  role text NOT NULL CHECK (role = ANY (ARRAY['client'::text, 'comercial'::text, 'soporte_tecnico'::text, 'logistica'::text, 'admin'::text])),
  area text,
  company_name text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.tipos_cirugia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  duracion_promedio integer,
  productos_comunes jsonb,
  especialidad character varying,
  es_activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tipos_cirugia_pkey PRIMARY KEY (id)
);

-- Tabla para gestionar los kits de cirugía
CREATE TABLE public.kits_cirugia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cirugia_id uuid NOT NULL,
  numero_kit character varying NOT NULL UNIQUE,
  qr_code character varying NOT NULL UNIQUE,
  estado character varying DEFAULT 'preparando'::character varying, -- preparando, listo, enviado, en_uso, devuelto, facturado
  fecha_creacion timestamp with time zone DEFAULT now(),
  fecha_preparacion timestamp with time zone,
  fecha_envio timestamp with time zone,
  fecha_recepcion timestamp with time zone,
  fecha_devolucion timestamp with time zone,
  comercial_id uuid,
  tecnico_id uuid,
  logistica_id uuid,
  observaciones text,
  ubicacion_actual character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kits_cirugia_pkey PRIMARY KEY (id),
  CONSTRAINT kits_cirugia_cirugia_id_fkey FOREIGN KEY (cirugia_id) REFERENCES public.cirugias(id),
  CONSTRAINT kits_cirugia_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.profiles(id),
  CONSTRAINT kits_cirugia_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.profiles(id),
  CONSTRAINT kits_cirugia_logistica_id_fkey FOREIGN KEY (logistica_id) REFERENCES public.profiles(id)
);

-- Tabla para el detalle de productos en cada kit
CREATE TABLE public.kit_productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  cantidad_solicitada integer NOT NULL DEFAULT 1,
  cantidad_preparada integer DEFAULT 0,
  cantidad_enviada integer DEFAULT 0,
  cantidad_utilizada integer DEFAULT 0,
  cantidad_devuelta integer DEFAULT 0,
  precio_unitario numeric,
  lote character varying,
  fecha_vencimiento date,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kit_productos_pkey PRIMARY KEY (id),
  CONSTRAINT kit_productos_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.kits_cirugia(id),
  CONSTRAINT kit_productos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);

-- Tabla para trazabilidad del flujo del kit
CREATE TABLE public.kit_trazabilidad (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL,
  accion character varying NOT NULL, -- creado, preparado, enviado, recibido, escaneado, devuelto, etc.
  estado_anterior character varying,
  estado_nuevo character varying NOT NULL,
  usuario_id uuid NOT NULL,
  ubicacion character varying,
  coordenadas_lat numeric,
  coordenadas_lng numeric,
  timestamp timestamp with time zone DEFAULT now(),
  observaciones text,
  metadata jsonb, -- Para datos adicionales como fotos, firmas digitales, etc.
  CONSTRAINT kit_trazabilidad_pkey PRIMARY KEY (id),
  CONSTRAINT kit_trazabilidad_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.kits_cirugia(id),
  CONSTRAINT kit_trazabilidad_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);

-- Tabla para códigos QR y su gestión
CREATE TABLE public.qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo character varying NOT NULL UNIQUE,
  tipo character varying NOT NULL DEFAULT 'kit'::character varying, -- kit, producto, ubicacion
  referencia_id uuid NOT NULL, -- ID del kit, producto, etc.
  es_activo boolean DEFAULT true,
  fecha_generacion timestamp with time zone DEFAULT now(),
  fecha_expiracion timestamp with time zone,
  veces_escaneado integer DEFAULT 0,
  ultimo_escaneo timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_codes_pkey PRIMARY KEY (id)
);

-- Tabla para registrar escaneos de QR
CREATE TABLE public.qr_escaneos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL,
  usuario_id uuid,
  fecha_escaneo timestamp with time zone DEFAULT now(),
  ubicacion character varying,
  coordenadas_lat numeric,
  coordenadas_lng numeric,
  dispositivo_info jsonb,
  accion_realizada character varying,
  resultado character varying DEFAULT 'exitoso'::character varying,
  observaciones text,
  CONSTRAINT qr_escaneos_pkey PRIMARY KEY (id),
  CONSTRAINT qr_escaneos_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id),
  CONSTRAINT qr_escaneos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.profiles(id)
);