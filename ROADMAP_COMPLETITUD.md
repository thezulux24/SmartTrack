# 🗺️ ROADMAP DE COMPLETITUD - SmartTrack App

**Fecha de Última Actualización**: 13 de Octubre, 2025  
**Nivel de Completitud Actual**: ~85%  
**Tiempo Estimado para Completar**: 8-10 semanas

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### ✅ **LO QUE YA ESTÁ COMPLETO** (85%)

#### **Sistema Operacional - SÓLIDO**
- ✅ **RBAC completo** (roles, permisos, guards, role.guard.ts)
- ✅ **Sistema de notificaciones** (17 tipos, integrado en 5 servicios)
  - Notificaciones para: cirugías, envíos, hojas de gasto, inventario crítico
  - Realtime subscriptions con Supabase
  - Badge y panel de notificaciones
- ✅ **CRUD completo**:
  - Cirugías (programar, editar, cancelar, cambiar estado)
  - Clientes y Hospitales
  - Inventario con movimientos (entradas/salidas)
  - Hojas de gasto con aprobación workflow
  - Tipos de cirugía
- ✅ **Gestión de kits quirúrgicos**:
  - Creación desde agenda
  - Preparación por logística
  - Validación por técnico
  - Devolución y procesamiento
- ✅ **Sistema de envíos**:
  - Asignación de mensajeros
  - Seguimiento de estados (programado → en_transito → entregado)
  - QR codes para validación pública
- ✅ **Chat por cirugía** con compartir ubicación
- ✅ **Trazabilidad completa** en `kit_trazabilidad` para todas las operaciones
- ✅ **Dashboards básicos**:
  - TecnicoDashboardComponent (kits pendientes, validados, en curso, devueltos)
  - LogisticaDashboardComponent (stats + alertas de urgencia)

---

## ❌ **LO QUE FALTA** (15%)

---

## 🔴 **PRIORIDAD CRÍTICA** (Semana 1-2)

### **1. Dashboard Comercial** ⭐⭐⭐⭐⭐
- **Estado**: ❌ NO EXISTE
- **Impacto**: CRÍTICO - Vista principal del rol comercial
- **Complejidad**: MEDIA (3-4 días)
- **Ubicación**: `src/app/features/internal/comercial/comercial-dashboard/`

**Funcionalidades requeridas:**
- [ ] Vista unificada de ventas y facturación diarias
- [ ] KPIs principales:
  - [ ] Cirugías programadas vs realizadas (tasa de cierre)
  - [ ] Cirugías canceladas con análisis de motivos
  - [ ] Tiempo promedio de respuesta a solicitudes
  - [ ] Estado financiero por cliente (facturación pendiente)
  - [ ] Clientes activos vs inactivos
- [ ] Agenda consolidada con cambios en tiempo real
- [ ] Alertas de clientes inactivos o de bajo consumo
- [ ] Panel motivacional: "¿Cómo voy hoy?"
- [ ] Acceso rápido a cotizaciones pendientes

**Justificación**: Los 3 comerciales entrevistados lo pidieron como prioridad #1. Sin esto, no tienen visibilidad de su desempeño.

**Notas de implementación**:
```typescript
// Estructura sugerida
src/app/features/internal/comercial/
├── comercial-dashboard/
│   ├── comercial-dashboard.component.ts
│   ├── comercial-dashboard.component.html
│   └── comercial-dashboard.component.css
└── comercial-routing.ts  // Actualizar con ruta al dashboard
```

---

### **2. Panel de KPIs para los 3 Roles** ⭐⭐⭐⭐⭐
- **Estado**: ⚠️ Dashboards básicos existen, pero SIN métricas de desempeño
- **Impacto**: CRÍTICO - Toma de decisiones estratégicas
- **Complejidad**: MEDIA-ALTA (5-6 días)
- **Ubicación**: `src/app/shared/components/kpi-dashboard/`

**Componente compartido**: `KpiDashboardComponent` con configuración por rol

#### **KPIs por Rol**:

**COMERCIAL:**
- [ ] Tasa de cierre (cirugías confirmadas / solicitadas) %
- [ ] Tasa de cancelación con análisis de causas
- [ ] Tiempo promedio de respuesta a solicitudes (horas/días)
- [ ] Valor promedio por cirugía ($)
- [ ] Clientes activos vs inactivos (últimos 30 días)
- [ ] Cotizaciones: enviadas, aprobadas, rechazadas, conversión %

**LOGÍSTICA:**
- [ ] % Entregas a tiempo (< 24h desde asignación)
- [ ] Tiempo promedio ciclo completo (despacho → entrega → facturación)
- [ ] % Errores de despacho (incompletos/incorrectos)
- [ ] Utilización de mensajeros (activos/total, entregas por mensajero)
- [ ] Kits con alertas de urgencia (cirugía < 24h)
- [ ] Stock crítico (productos bajo mínimo)

**TÉCNICO:**
- [ ] Tiempo promedio en cirugía (por tipo)
- [ ] % Cumplimiento de protocolos de validación
- [ ] Incidencias reportadas vs resueltas
- [ ] Kits devueltos con observaciones vs sin observaciones
- [ ] Tiempo de respuesta a asignaciones (desde notificación hasta validación)
- [ ] Hojas de gasto: pendientes, aprobadas, rechazadas

**Justificación**: Sin KPIs, no hay forma de medir eficiencia ni identificar problemas. Los 3 roles lo mencionaron como crítico.

**Notas de implementación**:
```typescript
// Interface para configuración por rol
interface KpiConfig {
  role: 'comercial' | 'logistica' | 'soporte_tecnico';
  kpis: KpiDefinition[];
}

interface KpiDefinition {
  id: string;
  label: string;
  value: number | string;
  unit: string;  // '%', '$', 'días', etc.
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  target?: number;  // Meta
  color?: string;   // Para visualización
}

// Usar Chart.js o similar para gráficas
```

---

### **3. Módulo de Reportes e Indicadores** ⭐⭐⭐⭐
- **Estado**: ❌ NO EXISTE
- **Impacto**: ALTO - Análisis y mejora continua
- **Complejidad**: MEDIA (4-5 días)
- **Ubicación**: `src/app/features/internal/reportes/`

**Funcionalidades requeridas:**
- [ ] Generación de reportes por período (diario, semanal, mensual, personalizado)
- [ ] Exportación a Excel/PDF
- [ ] Reportes predefinidos:
  - [ ] **Resumen de cirugías**: Por estado, hospital, técnico, tipo de cirugía
  - [ ] **Movimientos de inventario**: Entradas, salidas, stock actual, proyecciones
  - [ ] **Hojas de gasto**: Pendientes de aprobación, aprobadas, rechazadas, totales
  - [ ] **Desempeño por técnico**: Cirugías atendidas, tiempos, incidencias
  - [ ] **Facturación por cliente**: Total facturado, pendiente, mora
  - [ ] **Eficiencia logística**: Tiempos de entrega, errores, utilización de mensajeros
- [ ] Filtros avanzados por fecha, cliente, hospital, técnico, estado
- [ ] Gráficas interactivas (tendencias, comparativas)
- [ ] Guardar configuraciones de reportes favoritos

**Estructura sugerida**:
```
src/app/features/internal/reportes/
├── reportes-shell/
│   └── reportes-routing.ts
├── reportes-list/
│   ├── reportes-list.component.ts      (seleccionar tipo de reporte)
│   └── reportes-list.component.html
├── reportes-cirugia/
│   └── reportes-cirugia.component.ts
├── reportes-inventario/
│   └── reportes-inventario.component.ts
├── reportes-hojas-gasto/
│   └── reportes-hojas-gasto.component.ts
├── reportes-facturacion/
│   └── reportes-facturacion.component.ts
└── data-access/
    └── reportes.service.ts
```

**Justificación**: Los coordinadores regionales necesitan reportes para tomar decisiones estratégicas. Mencionado por todas las áreas.

**Librerías sugeridas**:
- **ExcelJS**: Exportación a Excel
- **jsPDF + jsPDF-AutoTable**: Exportación a PDF
- **Chart.js**: Gráficas interactivas

---

## 🟠 **PRIORIDAD ALTA** (Semana 3-5)

### **4. Módulo de Cotizaciones** ⭐⭐⭐⭐
- **Estado**: ❌ NO EXISTE (mencionado 5 veces en requerimientos.txt)
- **Impacto**: ALTO - Aumentar tasa de conversión comercial
- **Complejidad**: MEDIA-ALTA (5-6 días)
- **Ubicación**: `src/app/features/internal/cotizaciones/`

**Funcionalidades requeridas:**
- [ ] CRUD completo de cotizaciones
- [ ] Crear cotización desde productos/kits predefinidos
- [ ] Estados del flujo:
  - `borrador`: En creación
  - `enviada`: Enviada al cliente
  - `aprobada`: Cliente aceptó
  - `rechazada`: Cliente rechazó
  - `vencida`: Pasó fecha de vencimiento sin respuesta
- [ ] Campo `motivo_rechazo` para análisis
- [ ] Alertas de seguimiento (3 días sin respuesta)
- [ ] Convertir cotización aprobada en cirugía automáticamente
- [ ] Historial completo de cotizaciones por cliente
- [ ] Plantillas de cotización por tipo de cirugía
- [ ] Cálculo automático de subtotales, IVA, total
- [ ] Adjuntar términos y condiciones
- [ ] Exportar cotización a PDF para enviar

**Tablas necesarias**:
```sql
CREATE TABLE cotizaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_cotizacion TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_cirugia_id UUID REFERENCES tipos_cirugia(id),
  estado cotizacion_estado NOT NULL DEFAULT 'borrador',
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  iva DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  observaciones TEXT,
  motivo_rechazo TEXT,
  terminos_condiciones TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE cotizacion_estado AS ENUM (
  'borrador',
  'enviada',
  'aprobada',
  'rechazada',
  'vencida'
);

CREATE TABLE cotizacion_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(12,2) NOT NULL,
  precio_total DECIMAL(12,2) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(cliente_id);
CREATE INDEX idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX idx_cotizaciones_fecha_emision ON cotizaciones(fecha_emision);
CREATE INDEX idx_cotizacion_items_cotizacion ON cotizacion_items(cotizacion_id);

-- RLS Policies (ajustar según roles)
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;

-- Función para generar número de cotización
CREATE OR REPLACE FUNCTION generate_numero_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_cotizacion := 'COT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                           LPAD(NEXTVAL('cotizaciones_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE cotizaciones_seq START 1;
CREATE TRIGGER trigger_generate_numero_cotizacion
  BEFORE INSERT ON cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION generate_numero_cotizacion();
```

**Justificación**: Comerciales pierden ventas por falta de seguimiento estructurado a cotizaciones. Sistema actual es manual y disperso.

---

### **5. Geolocalización en Tiempo Real** ⭐⭐⭐⭐
- **Estado**: ⚠️ Chat tiene compartir ubicación puntual, pero NO tracking continuo
- **Impacto**: ALTO - Seguridad, confianza del cliente, trazabilidad
- **Complejidad**: ALTA (6-7 días + integración Maps API)
- **Ubicación**: `src/app/features/internal/logistica/mapa-envios/`

**Funcionalidades requeridas:**
- [ ] Tracking en tiempo real de mensajeros en ruta
- [ ] Mapa interactivo con todos los envíos activos
- [ ] Marcadores diferenciados por estado:
  - 🟢 Verde: Programado (próximo a salir)
  - 🔵 Azul: En tránsito
  - ✅ Verde check: Entregado
- [ ] ETA (tiempo estimado de llegada) calculado dinámicamente
- [ ] Alertas de desvío de ruta no autorizado
- [ ] Historial de rutas realizadas (replay)
- [ ] Panel lateral con lista de envíos activos
- [ ] Click en marcador muestra detalle del envío
- [ ] Actualización automática cada 30 segundos

**Tecnologías sugeridas**:
- **Leaflet.js** (open source, sin límites API) + OpenStreetMap
  - O **Google Maps API** (tiene costo pero mejor precisión)
- **Supabase Realtime** para actualización de ubicaciones
- **Geolocation API** del navegador para capturar ubicación del mensajero

**Cambios en base de datos**:
```sql
-- Extender tabla envios
ALTER TABLE envios ADD COLUMN ubicacion_actual GEOGRAPHY(Point, 4326);
ALTER TABLE envios ADD COLUMN ultima_actualizacion_ubicacion TIMESTAMPTZ;

-- Tabla para historial de ubicaciones (opcional, para replay)
CREATE TABLE envio_ubicaciones_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  envio_id UUID REFERENCES envios(id) ON DELETE CASCADE,
  ubicacion GEOGRAPHY(Point, 4326) NOT NULL,
  velocidad DECIMAL(5,2),  -- km/h
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_envio_ubicaciones_envio ON envio_ubicaciones_historial(envio_id);
CREATE INDEX idx_envio_ubicaciones_timestamp ON envio_ubicaciones_historial(timestamp);
```

**Componente principal**:
```typescript
src/app/features/internal/logistica/mapa-envios/
├── mapa-envios.component.ts       (vista tipo "aeropuerto" con mapa)
├── mapa-envios.component.html
├── mapa-envios.component.css
└── services/
    └── geolocalizacion.service.ts  (tracking, cálculo ETA, alertas)
```

**Justificación**: Los 3 logísticos entrevistados lo mencionaron como crítico para:
- Reducir incidencias y reclamos de clientes
- Mejorar coordinación en tiempo real
- Detectar desvíos o retrasos inmediatamente
- Aumentar confianza del cliente

---

### **6. Optimización de Rutas y Asignación Inteligente** ⭐⭐⭐
- **Estado**: ❌ NO EXISTE - Asignación manual actual
- **Impacto**: MEDIO-ALTO - Eficiencia operativa, reducción de costos
- **Complejidad**: ALTA (7-8 días + algoritmo)
- **Ubicación**: `src/app/shared/services/rutas.service.ts`

**Funcionalidades requeridas:**
- [ ] Algoritmo de asignación inteligente de mensajeros
- [ ] Scoring automático considerando:
  - [ ] Distancia al punto de recogida (menor = mejor)
  - [ ] Carga actual de entregas pendientes (menor = mejor)
  - [ ] Urgencia de entregas actuales (cirugía < 24h prioritaria)
  - [ ] Estado del mensajero (disponible > ocupado)
  - [ ] Zona de operación preferencial
- [ ] Sugerencia de ruta óptima para múltiples entregas
- [ ] Priorización automática (urgente < 24h primero)
- [ ] Visualización de ruta sugerida en mapa
- [ ] Posibilidad de override manual con justificación

**Algoritmo sugerido** (Scoring System):
```typescript
interface MensajeroScore {
  mensajero_id: string;
  nombre: string;
  score: number;  // Mayor score = mejor opción
  factores: {
    distancia: number;      // 0-100 (invertido: menor distancia = mayor puntaje)
    carga: number;          // 0-100 (invertido: menos entregas = mayor puntaje)
    urgencia: number;       // 0-100 (considera urgencia de sus entregas actuales)
    disponibilidad: number; // 0 o 100 (disponible o no)
  };
}

// Fórmula de scoring (ajustable según prioridades del negocio)
score = (distancia * 0.3) + (carga * 0.25) + (urgencia * 0.25) + (disponibilidad * 0.2)
```

**Justificación**: Reduce tiempos de entrega, costos operativos y mejora experiencia del cliente. Mencionado por logística y coordinadores regionales.

---

## 🟡 **PRIORIDAD MEDIA** (Semana 6-8)

### **7. Registro de Tiempos Muertos** ⭐⭐⭐
- **Estado**: ❌ NO EXISTE
- **Impacto**: MEDIO - Mejora de eficiencia técnica, análisis de causas
- **Complejidad**: BAJA (2-3 días)
- **Ubicación**: Integrar en `CirugiaEjecucionComponent`

**Funcionalidades requeridas:**
- [ ] Formulario simple durante ejecución de cirugía
- [ ] Motivos predefinidos:
  - Espera de cliente/paciente
  - Falta de insumo/producto
  - Retraso en quirófano
  - Problema técnico/equipo
  - Otros (especificar)
- [ ] Timestamp inicio/fin automático
- [ ] Cálculo automático de duración
- [ ] Mostrar en hoja de gasto y reporte de cirugía
- [ ] Análisis de causas más frecuentes (para mejora continua)

**Tabla nueva**:
```sql
CREATE TABLE tiempos_muertos_cirugia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cirugia_id UUID REFERENCES cirugias(id) ON DELETE CASCADE,
  motivo tiempo_muerto_motivo NOT NULL,
  descripcion TEXT,
  timestamp_inicio TIMESTAMPTZ NOT NULL,
  timestamp_fin TIMESTAMPTZ,
  duracion_minutos INTEGER GENERATED ALWAYS AS 
    (EXTRACT(EPOCH FROM (timestamp_fin - timestamp_inicio)) / 60) STORED,
  reportado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE tiempo_muerto_motivo AS ENUM (
  'espera_paciente',
  'falta_insumo',
  'retraso_quirofano',
  'problema_tecnico',
  'problema_equipo',
  'coordinacion_personal',
  'otro'
);

CREATE INDEX idx_tiempos_muertos_cirugia ON tiempos_muertos_cirugia(cirugia_id);
```

**Justificación**: Técnicos y coordinadores necesitan medir tiempos muertos para identificar cuellos de botella y mejorar eficiencia.

---

### **8. Formulario de Eventualidades e Incidentes** ⭐⭐⭐
- **Estado**: ⚠️ Parcial - hay observaciones en varias partes, falta estructura unificada
- **Impacto**: MEDIO - Trazabilidad de problemas, mejora continua
- **Complejidad**: BAJA-MEDIA (2-3 días)
- **Ubicación**: `src/app/features/internal/eventualidades/`

**Funcionalidades requeridas:**
- [ ] Formulario estructurado de reporte de incidencias
- [ ] Categorías:
  - Cancelación de cirugía
  - Retraso significativo (> 2 horas)
  - Problema con kit (incompleto, producto defectuoso)
  - Problema en quirófano/hospital
  - Problema con cliente
  - Accidente/Seguridad
  - Otros
- [ ] Nivel de severidad: Baja, Media, Alta, Crítica
- [ ] Adjuntar fotos (opcional, útil para evidencia)
- [ ] Descripción detallada
- [ ] Acciones tomadas
- [ ] Notificación automática a comercial + logística + admin
- [ ] Seguimiento de resolución
- [ ] Historial de eventualidades por cirugía/técnico

**Tabla nueva**:
```sql
CREATE TABLE eventualidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cirugia_id UUID REFERENCES cirugias(id) ON DELETE CASCADE,
  categoria eventualidad_categoria NOT NULL,
  severidad eventualidad_severidad NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  acciones_tomadas TEXT,
  fotos_urls TEXT[],  -- Array de URLs a storage de Supabase
  estado eventualidad_estado DEFAULT 'reportada',
  reportado_por UUID REFERENCES profiles(id),
  resuelto_por UUID REFERENCES profiles(id),
  fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE eventualidad_categoria AS ENUM (
  'cancelacion',
  'retraso',
  'problema_kit',
  'problema_quirofano',
  'problema_cliente',
  'accidente',
  'otro'
);

CREATE TYPE eventualidad_severidad AS ENUM ('baja', 'media', 'alta', 'critica');
CREATE TYPE eventualidad_estado AS ENUM ('reportada', 'en_revision', 'resuelta', 'cerrada');

CREATE INDEX idx_eventualidades_cirugia ON eventualidades(cirugia_id);
CREATE INDEX idx_eventualidades_estado ON eventualidades(estado);
```

**Justificación**: Permite identificar patrones de problemas y tomar acciones correctivas. Mencionado por técnicos y coordinadores.

---

### **9. Proyecciones de Inventario** ⭐⭐⭐
- **Estado**: ❌ NO EXISTE
- **Impacto**: MEDIO - Prevención de quiebres, planificación de compras
- **Complejidad**: MEDIA (4 días)
- **Ubicación**: `src/app/features/internal/inventario/proyecciones-inventario/`

**Funcionalidades requeridas:**
- [ ] Proyección de agotamiento basada en consumo histórico (últimos 30/60/90 días)
- [ ] Simular impacto de nuevos clientes/cirugías en stock
- [ ] Alertas tempranas (15 días antes de agotamiento proyectado)
- [ ] Sugerencias de compra con cantidades recomendadas
- [ ] Considerar lead time de proveedores
- [ ] Proyección por línea de producto
- [ ] Exportar proyecciones a Excel

**Justificación**: Permite planificación proactiva de compras y evita quiebres de stock que impactan cirugías.

---

### **10. Confirmación Automática de Recursos** ⭐⭐
- **Estado**: ⚠️ Parcial - validación de stock existe en kit-builder, falta automatización en formulario cirugía
- **Impacto**: BAJO-MEDIO - Reduce errores de programación
- **Complejidad**: BAJA (1-2 días)
- **Ubicación**: Integrar en `CirugiaFormComponent`

**Funcionalidades requeridas:**
- [ ] Al crear/editar cirugía, validar automáticamente:
  - [ ] Stock disponible para productos del tipo de cirugía
  - [ ] Disponibilidad de técnico asignado (no tiene otra cirugía al mismo tiempo)
  - [ ] Ningún conflicto de horario en el mismo hospital
- [ ] Mostrar alerta visual si algún recurso no está disponible
- [ ] Permitir override manual con justificación obligatoria
- [ ] Sugerir fecha/hora alternativa si hay conflictos

**Justificación**: Reduce cancelaciones de último momento por falta de recursos o conflictos de agenda.

---

### **11. Panel Motivacional Comercial** ⭐⭐
- **Estado**: ❌ NO EXISTE
- **Impacto**: BAJO - Engagement comercial, gamificación
- **Complejidad**: BAJA (2 días)
- **Ubicación**: Integrar en `ComercialDashboardComponent`

**Funcionalidades requeridas:**
- [ ] Metas del mes (configurables por admin)
- [ ] Progreso visual (circular gauge o barra de progreso)
- [ ] Ranking de vendedores (opcional, anónimo o con nombres)
- [ ] Frases motivacionales rotativas
- [ ] Logros desbloqueados (gamificación):
  - "Primera venta del mes"
  - "10 cirugías cerradas"
  - "Cliente recuperado"
  - "Mes sin cancelaciones"
- [ ] Histórico de logros

**Justificación**: Mencionado por comerciales como "nice to have" para mantener motivación y competencia sana.

---

## 📅 **ROADMAP DETALLADO DE IMPLEMENTACIÓN**

### **Sprint 1: Dashboards & KPIs** (Semana 1-2)
**Objetivo**: Dar visibilidad de desempeño a los 3 roles

**Tareas**:
1. ✅ **Día 1-3**: Crear `ComercialDashboardComponent`
   - Vista unificada ventas/facturación
   - KPIs básicos calculados
   - Agenda consolidada con filtros
   - Panel "¿Cómo voy hoy?" con progreso del día

2. ✅ **Día 4-7**: Crear `KpiDashboardComponent` compartido
   - Interface `KpiConfig` y `KpiDefinition`
   - Cálculo de KPIs para 3 roles desde servicios
   - Gráficas con Chart.js (line, bar, doughnut)
   - Filtros por período (hoy, semana, mes, personalizado)

3. ✅ **Día 8**: Mejorar `TecnicoDashboardComponent`
   - Integrar KPIs de desempeño técnico
   - Agregar métricas de tiempo promedio
   - Mostrar incidencias reportadas

4. ✅ **Día 9**: Mejorar `LogisticaDashboardComponent`
   - Agregar KPIs logísticos calculados
   - Panel tipo "aeropuerto" mejorado con más info
   - Alertas priorizadas por urgencia

5. ✅ **Día 10**: Testing y ajustes

**Resultado**: Los 3 roles tienen dashboards completos con métricas en tiempo real.

---

### **Sprint 2: Reportes** (Semana 3)
**Objetivo**: Análisis y exportación de datos

**Tareas**:
1. ✅ **Día 1**: Crear estructura del módulo Reportes
   - Routing y shell component
   - Service base para reportes

2. ✅ **Día 2**: Implementar reportes de cirugías
   - Filtros por período, estado, hospital, técnico
   - Gráficas de tendencias
   - Exportación Excel/PDF

3. ✅ **Día 3**: Implementar reportes de inventario
   - Movimientos (entradas/salidas)
   - Stock actual vs mínimo
   - Proyecciones simples

4. ✅ **Día 4**: Implementar reportes de hojas de gasto y facturación
   - Pendientes de aprobación
   - Totales por período
   - Desglose por cliente

5. ✅ **Día 5**: Integración de librerías de exportación
   - ExcelJS para Excel
   - jsPDF para PDF
   - Testing y ajustes

**Resultado**: Coordinadores pueden generar reportes detallados para análisis y toma de decisiones.

---

### **Sprint 3: Cotizaciones** (Semana 4-5)
**Objetivo**: Mejorar tasa de conversión comercial

**Tareas**:
1. ✅ **Día 1**: Crear tablas en base de datos
   - `cotizaciones` con todos los campos
   - `cotizacion_items` para detalle
   - Triggers y funciones para número automático
   - RLS policies

2. ✅ **Día 2-3**: Crear módulo Cotizaciones
   - Routing y shell component
   - Models e interfaces TypeScript
   - Service con CRUD completo

3. ✅ **Día 4-5**: Implementar formulario de creación/edición
   - Selección de cliente y tipo de cirugía
   - Agregar/quitar productos dinámicamente
   - Cálculo automático de totales
   - Validaciones

4. ✅ **Día 6**: Implementar lista y detalle de cotizaciones
   - Vista de lista con filtros por estado
   - Vista de detalle con timeline de estados
   - Botones de acción según estado

5. ✅ **Día 7**: Implementar flujo de aprobación
   - Enviar cotización → notificar cliente
   - Aprobar → convertir a cirugía
   - Rechazar → registrar motivo
   - Alertas de seguimiento (3 días sin respuesta)

6. ✅ **Día 8**: Exportar cotización a PDF
   - Plantilla con logo y diseño corporativo
   - Incluir términos y condiciones

7. ✅ **Día 9-10**: Testing completo y ajustes

**Resultado**: Control completo de cotizaciones desde emisión hasta cierre o rechazo.

---

### **Sprint 4: Geolocalización** (Semana 6-7)
**Objetivo**: Tracking en tiempo real de envíos

**Tareas**:
1. ✅ **Día 1**: Configurar Leaflet.js
   - Instalar dependencias
   - Crear servicio de geolocalización
   - Configurar mapa base con OpenStreetMap

2. ✅ **Día 2-3**: Extender base de datos
   - Agregar campos de ubicación a `envios`
   - Crear tabla `envio_ubicaciones_historial`
   - Función para actualizar ubicación desde app del mensajero

3. ✅ **Día 4-5**: Implementar `MapaEnviosComponent`
   - Mapa interactivo con marcadores por estado
   - Panel lateral con lista de envíos activos
   - Click en marcador muestra detalle

4. ✅ **Día 6-7**: Implementar tracking en tiempo real
   - Supabase Realtime subscription a ubicaciones
   - Actualización automática de marcadores cada 30s
   - Cálculo de ETA dinámico

5. ✅ **Día 8**: Implementar alertas de desvío
   - Detectar si mensajero se aleja mucho de ruta
   - Notificar a logística

6. ✅ **Día 9**: Implementar historial de rutas (replay)
   - Reproducir ruta realizada
   - Analizar tiempos y paradas

7. ✅ **Día 10**: Testing en campo y ajustes

**Resultado**: Visibilidad completa de envíos en tránsito con mapa en tiempo real.

---

### **Sprint 5: Optimización de Rutas** (Semana 8)
**Objetivo**: Asignación inteligente de mensajeros

**Tareas**:
1. ✅ **Día 1-2**: Implementar servicio de rutas
   - Interface `MensajeroScore`
   - Algoritmo de scoring
   - Cálculo de distancias (Haversine formula o API)

2. ✅ **Día 3-4**: Integrar en asignación de mensajeros
   - Sugerir mejor mensajero automáticamente
   - Mostrar scoring y factores
   - Permitir override manual

3. ✅ **Día 5-6**: Implementar optimización de ruta múltiple
   - Algoritmo TSP (Traveling Salesman Problem) simplificado
   - Sugerir orden óptimo de entregas
   - Visualizar ruta sugerida en mapa

4. ✅ **Día 7**: Testing y ajustes del algoritmo

**Resultado**: Reducción de tiempos de entrega y costos operativos mediante asignación inteligente.

---

### **Sprint 6: Funcionalidades Complementarias** (Semana 9-10)
**Objetivo**: Completar features menores

**Tareas**:
1. ✅ **Día 1-2**: Registro de tiempos muertos
   - Crear tabla y enum
   - Integrar formulario en `CirugiaEjecucionComponent`
   - Mostrar en reportes

2. ✅ **Día 3-4**: Formulario de eventualidades
   - Crear tabla y enums
   - Módulo de eventualidades con CRUD
   - Upload de fotos a Supabase Storage
   - Notificaciones automáticas

3. ✅ **Día 5-7**: Proyecciones de inventario
   - Algoritmo de proyección basado en consumo histórico
   - Componente de visualización
   - Alertas tempranas
   - Sugerencias de compra

4. ✅ **Día 8**: Confirmación automática de recursos
   - Validaciones en `CirugiaFormComponent`
   - Alertas visuales
   - Override con justificación

5. ✅ **Día 9**: Panel motivacional
   - Componente con metas y progreso
   - Sistema de logros
   - Integrar en dashboard comercial

6. ✅ **Día 10**: Testing final y ajustes

**Resultado**: App 100% completa según requerimientos especificados.

---

## 🎯 **RESUMEN EJECUTIVO**

### **Métricas del Proyecto**
- **Tiempo Total Estimado**: 8-10 semanas (40-50 días laborables)
- **Nivel de Completitud Actual**: ~85%
- **Lo que Falta**: 15% (mayormente features analíticas y de optimización)
- **Esfuerzo Restante**: ~40 días-persona

### **Distribución de Esfuerzo por Prioridad**
- 🔴 **CRÍTICO** (Sem 1-2): 30% del esfuerzo - Dashboards, KPIs, Reportes
- 🟠 **ALTO** (Sem 3-5): 45% del esfuerzo - Cotizaciones, Geolocalización, Rutas
- 🟡 **MEDIO** (Sem 6-10): 25% del esfuerzo - Features complementarias

### **Priorización Clara**
1. **CRÍTICO** (1-2 sem): Dashboard Comercial + KPIs para 3 roles + Reportes
2. **ALTO** (3-5 sem): Cotizaciones + Geolocalización + Optimización de Rutas
3. **MEDIO** (6-10 sem): Tiempos muertos + Eventualidades + Proyecciones + Features menores

### **Recomendación Estratégica**
**Enfócate primero en los Dashboards y KPIs** (Sprint 1-2). Son los más solicitados por los 3 roles y tienen mayor impacto inmediato en satisfacción de usuarios. Una vez que todos tengan visibilidad de su desempeño, continúa con Reportes y Cotizaciones.

La geolocalización es importante pero puede esperar hasta semana 6 si recursos son limitados. Lo operacional (CRUD, notificaciones, trazabilidad) ya está **sólido y funcional**.

### **Riesgos Identificados**
1. **Geolocalización**: Requiere pruebas en campo con conexión de datos real
2. **Optimización de rutas**: Algoritmo puede requerir ajustes según uso real
3. **Reportes**: Exportación a PDF puede tener problemas de formato con datos largos
4. **Cotizaciones**: Integración con sistema de facturación externo (si aplica)

### **Próximos Pasos Inmediatos**
1. ✅ Crear `ComercialDashboardComponent` (3 días)
2. ✅ Implementar cálculo de KPIs básicos en servicios existentes (2 días)
3. ✅ Crear `KpiDashboardComponent` compartido con Chart.js (3 días)
4. ✅ Mejorar dashboards de Técnico y Logística con KPIs (2 días)

---

## 📝 **NOTAS Y CONSIDERACIONES**

### **Tecnologías Adicionales Necesarias**
- **Chart.js**: Gráficas interactivas para KPIs y reportes
- **ExcelJS**: Exportación de reportes a Excel
- **jsPDF + jsPDF-AutoTable**: Exportación de reportes y cotizaciones a PDF
- **Leaflet.js**: Mapas interactivos para geolocalización
- **date-fns** o **Day.js**: Manipulación avanzada de fechas para reportes

### **Consideraciones de Rendimiento**
- KPIs deben calcularse de forma eficiente (usar índices en BD, cachear si es posible)
- Reportes con muchos datos deben implementar paginación
- Mapa con muchos marcadores debe usar clustering (Leaflet.markercluster)
- Realtime subscriptions deben limitarse solo a datos necesarios

### **Consideraciones de UX**
- Dashboards deben cargar rápido (< 2 segundos)
- Gráficas deben ser responsive y legibles en móvil
- Exportaciones deben mostrar progress indicator
- Mapas deben tener controles intuitivos (zoom, centrar, filtros)

### **Testing Recomendado**
- Unit tests para algoritmos (scoring, proyecciones, ETA)
- Integration tests para flujos críticos (cotización → cirugía)
- E2E tests para dashboards y reportes
- Testing en campo para geolocalización con diferentes conexiones

---

## 🔄 **CONTROL DE CAMBIOS**

### **Versión 1.0** - 13 de Octubre, 2025
- ✅ Documento inicial creado
- ✅ Análisis completo de estado actual (85% completitud)
- ✅ Identificación de 11 funcionalidades faltantes
- ✅ Priorización en 3 niveles (Crítica, Alta, Media)
- ✅ Roadmap detallado en 6 sprints (8-10 semanas)
- ✅ Estimaciones de esfuerzo y complejidad
- ✅ Especificaciones técnicas para cada funcionalidad
- ✅ Recomendaciones estratégicas de implementación

### **Versión 1.1** - 13 de Octubre, 2025 (Mismo día)
- ✅ **Corrección de permisos de navegación para rol Técnico**:
  - Modificado `role-permissions.config.ts`: Técnicos ahora solo acceden a `/internal/agenda/mi-agenda` (NO a `/internal/agenda` general)
  - Modificado `internal-home.component.ts`: Menú muestra "Mi Agenda" para técnicos y "Agenda" para comercial/logística
  - **Justificación**: Los técnicos solo necesitan ver SUS cirugías asignadas, no toda la agenda general
  - **Componente afectado**: `AgendaTecnicoComponent` (`/internal/agenda/mi-agenda`)
  - **Roles con acceso a agenda general**: `admin`, `comercial`, `logistica`
  - **Roles con acceso a "Mi Agenda"**: `soporte_tecnico`

### **Próximas Actualizaciones**
- [ ] Versión 1.2: Actualizar estado después de Sprint 1 (dashboards)
- [ ] Versión 1.3: Actualizar estado después de Sprint 2 (reportes)
- [ ] Versión 1.4: Ajustar estimaciones según avance real
- [ ] Versión 2.0: Revisión completa al finalizar implementación

---

**Documento Vivo**: Este roadmap debe actualizarse semanalmente con el progreso real, ajustes de prioridades y nuevos hallazgos durante la implementación.
