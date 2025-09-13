-- ====================================
-- 1. TABLA PROFILES Y AUTENTICACIÓN
-- ====================================

-- Crear tabla profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN (
    'client', 
    'comercial', 
    'soporte_tecnico', 
    'logistica', 
    'admin'
  )),
  area TEXT, -- para usuarios internos: 'comercial', 'soporte', 'logistica'
  company_name TEXT, -- para clientes
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: usuarios pueden ver solo su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política: usuarios pueden actualizar solo su propio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política: solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- ====================================
-- 2. MÓDULO INVENTARIO
-- ====================================

CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL, -- 'osteosintesis', 'columna', 'trauma', 'fijacion_externa'
  precio DECIMAL(10,2),
  stock_minimo INTEGER DEFAULT 5,
  es_activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE, -- ✅ RELACIÓN
  cantidad INTEGER NOT NULL DEFAULT 0,
  ubicacion VARCHAR(100) DEFAULT 'sede_principal',
  estado VARCHAR(50) DEFAULT 'disponible', -- 'disponible', 'asignado', 'usado'
  fecha_vencimiento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID REFERENCES inventario(id) ON DELETE CASCADE, -- ✅ RELACIÓN A INVENTARIO
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,     -- ✅ RELACIÓN A PRODUCTO
  tipo VARCHAR(50) NOT NULL, -- 'entrada', 'salida', 'ajuste'
  cantidad INTEGER NOT NULL,
  motivo VARCHAR(255),
  usuario_id UUID REFERENCES profiles(id) NOT NULL,               -- ✅ RELACIÓN A USUARIO
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos de ejemplo
INSERT INTO productos (codigo, nombre, categoria, precio, stock_minimo) VALUES
('OST001', 'Placa de Titanio 3.5mm', 'osteosintesis', 150000, 5),
('OST002', 'Tornillos Cortical 3.5x20mm', 'osteosintesis', 25000, 20),
('COL001', 'Sistema de Fijación Lumbar', 'columna', 800000, 2),
('TRA001', 'Clavo Endomedular', 'trauma', 450000, 3),
('FIJ001', 'Fijador Externo Ilizarov', 'fijacion_externa', 1200000, 1);

-- Inventario inicial
INSERT INTO inventario (producto_id, cantidad, ubicacion) 
SELECT id, 
  CASE 
    WHEN stock_minimo <= 5 THEN stock_minimo + 2
    ELSE stock_minimo + 10
  END,
  'sede_principal'
FROM productos;

-- ====================================
-- 3. MÓDULO AGENDA/CIRUGÍAS
-- ====================================

CREATE TABLE hospitales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  direccion TEXT,
  telefono VARCHAR(20),
  contacto_principal VARCHAR(200),
  email VARCHAR(100),
  ciudad VARCHAR(100),
  es_activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_hospitales_ciudad ON hospitales(ciudad);
CREATE INDEX idx_hospitales_activo ON hospitales(es_activo);

CREATE TABLE tipos_cirugia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  duracion_promedio INTEGER, -- en minutos
  productos_comunes JSONB, -- Array de IDs de productos frecuentes
  especialidad VARCHAR(100), -- 'traumatologia', 'ortopedia', etc.
  es_activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cirugias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cirugia VARCHAR(50) UNIQUE NOT NULL, -- CIR-2024-001
  paciente_nombre VARCHAR(200) NOT NULL,
  paciente_documento VARCHAR(50),
  paciente_telefono VARCHAR(20),
  hospital VARCHAR(200) NOT NULL,
  medico_cirujano VARCHAR(200) NOT NULL,
  tipo_cirugia VARCHAR(100) NOT NULL, -- 'traumatologia', 'ortopedia', 'columna', etc.
  fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
  hora_inicio TIME,
  duracion_estimada INTEGER, -- en minutos
  estado VARCHAR(50) DEFAULT 'programada', -- 'programada', 'en_curso', 'completada', 'cancelada', 'urgencia'
  prioridad VARCHAR(20) DEFAULT 'normal', -- 'baja', 'normal', 'alta', 'urgencia'
  notas TEXT,
  tecnico_asignado_id UUID REFERENCES profiles(id),
  usuario_creador_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_cirugias_fecha ON cirugias(fecha_programada);
CREATE INDEX idx_cirugias_estado ON cirugias(estado);
CREATE INDEX idx_cirugias_tecnico ON cirugias(tecnico_asignado_id);
CREATE INDEX idx_cirugias_hospital ON cirugias(hospital);

CREATE TABLE cirugia_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cirugia_id UUID REFERENCES cirugias(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad_requerida INTEGER NOT NULL DEFAULT 1,
  cantidad_utilizada INTEGER DEFAULT 0,
  es_implante BOOLEAN DEFAULT false,
  numero_lote VARCHAR(100),
  fecha_vencimiento DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_cirugia_productos_cirugia ON cirugia_productos(cirugia_id);
CREATE INDEX idx_cirugia_productos_producto ON cirugia_productos(producto_id);
CREATE UNIQUE INDEX idx_cirugia_productos_unique ON cirugia_productos(cirugia_id, producto_id, numero_lote);

CREATE TABLE agenda_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id UUID REFERENCES profiles(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  disponible BOOLEAN DEFAULT true,
  motivo_no_disponible VARCHAR(200), -- 'vacaciones', 'enfermedad', 'otra_cirugia'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_agenda_tecnicos_fecha ON agenda_tecnicos(fecha);
CREATE INDEX idx_agenda_tecnicos_tecnico ON agenda_tecnicos(tecnico_id);
CREATE UNIQUE INDEX idx_agenda_tecnicos_unique ON agenda_tecnicos(tecnico_id, fecha, hora_inicio);

CREATE TABLE cirugia_seguimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cirugia_id UUID REFERENCES cirugias(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  comentario TEXT,
  usuario_id UUID REFERENCES profiles(id) NOT NULL,
  fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_seguimiento_cirugia ON cirugia_seguimiento(cirugia_id);
CREATE INDEX idx_seguimiento_fecha ON cirugia_seguimiento(fecha_cambio);

-- ====================================
-- 4. POLÍTICAS RLS PARA CIRUGÍAS
-- ====================================

-- Habilitar RLS en todas las tablas
ALTER TABLE cirugias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cirugia_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_cirugia ENABLE ROW LEVEL SECURITY;
ALTER TABLE cirugia_seguimiento ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
CREATE POLICY "Users can view cirugias" ON cirugias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert cirugias" ON cirugias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update cirugias" ON cirugias FOR UPDATE USING (auth.role() = 'authenticated');

-- ====================================
-- 5. MODIFICACIONES PENDIENTES (COMENTADAS)
-- ====================================

-- 2. Agregar nuevas columnas con FK
ALTER TABLE cirugias ADD COLUMN hospital_id UUID REFERENCES hospitales(id);
ALTER TABLE cirugias ADD COLUMN tipo_cirugia_id UUID REFERENCES tipos_cirugia(id);

-- 3. Migrar datos existentes (si los hay)
-- UPDATE cirugias SET hospital_id = (SELECT id FROM hospitales WHERE nombre = cirugias.hospital) WHERE hospital IS NOT NULL;
-- UPDATE cirugias SET tipo_cirugia_id = (SELECT id FROM tipos_cirugia WHERE nombre = cirugias.tipo_cirugia) WHERE tipo_cirugia IS NOT NULL;

-- 4. Hacer las nuevas columnas obligatorias
ALTER TABLE cirugias ALTER COLUMN hospital_id SET NOT NULL;
ALTER TABLE cirugias ALTER COLUMN tipo_cirugia_id SET NOT NULL;

-- 5. Opcional: Eliminar las columnas de texto (después de verificar que todo funciona)
-- ALTER TABLE cirugias DROP COLUMN hospital;
-- ALTER TABLE cirugias DROP COLUMN tipo_cirugia;

-- 6. Crear índices para las nuevas FK
CREATE INDEX idx_cirugias_hospital_id ON cirugias(hospital_id);
CREATE INDEX idx_cirugias_tipo_cirugia_id ON cirugias(tipo_cirugia_id);