# PLAN DE DESARROLLO SMARTTRACK - ACTUALIZADO
**Fecha:** 1 de Octubre 2025  
**Estado:** Listo para implementar flujo completo Comercial → Logística → Técnico  
**Prioridad:** FASE 1-2 (Solicitud de Kit + Aprobación Logística)

---

## 🎯 CONTEXTO ACTUAL

### ✅ Lo que YA funciona:
- ✅ Comercial puede crear cirugías
- ✅ Kit-builder para crear kits manualmente
- ✅ Hojas de gasto completas (FASE 5-7)
- ✅ Inventario y movimientos_inventario en BD
- ✅ Constraint de estados de kit actualizado

### 🔴 Lo que FALTA implementar:
- ❌ Solicitud automática de kit al crear cirugía
- ❌ Vista de aprobación para Logística
- ❌ Preparación de kit con validación de inventario
- ❌ Sistema de QR para entrega
- ❌ Notificaciones automáticas

---

## 🔄 ESTADOS DEL KIT (11 estados según flujo)

```typescript
export type EstadoKit = 
  | 'solicitado'         // FASE 1: Comercial solicita
  | 'alistándose'        // FASE 2: Logística aprobó ⚠️ AGREGAR A BD
  | 'preparando'         // FASE 2: Preparando productos
  | 'preparado'          // FASE 2: Listo para despacho
  | 'despachado'         // FASE 3: Emisario lo llevó
  | 'entregado'          // FASE 3: Técnico recibió con QR
  | 'en_uso'             // FASE 4: Durante cirugía
  | 'pendiente_recogida' // FASE 5: Listo para recoger ⚠️ AGREGAR A BD
  | 'recogido'           // FASE 6: Emisario recogió
  | 'en_lavado'          // FASE 6: Esterilización
  | 'disponible'         // FASE 6: Listo para próxima cirugía
  | 'cancelado';         // Cancelado
```

---

## 📐 ARQUITECTURA DE IMPLEMENTACIÓN

### Nuevos módulos a crear:

```
src/app/features/internal/
├── logistica/                           [CREAR COMPLETO]
│   ├── logistica-routing.ts
│   ├── logistica-dashboard/
│   │   └── logistica-dashboard.component.ts
│   ├── kits-pendientes/
│   │   ├── kits-pendientes-list.component.ts
│   │   └── kit-aprobacion-form.component.ts
│   └── kit-preparacion/
│       └── kit-preparacion.component.ts
└── inventario/                          [MODIFICAR]
    ├── inventario-list.component.ts
    └── movimientos-inventario.component.ts
```

---

## 🚀 FASE 1: SOLICITUD DE KIT POR COMERCIAL

### TODO 1: Modificar creación de cirugía
**Archivo:** `src/app/features/internal/agenda/cirugia-form/cirugia-form.component.ts`

**Objetivo:** Al crear cirugía, crear kit automáticamente con estado `solicitado`

**Cambios:**
1. Obtener productos estándar por tipo de cirugía
2. Validar inventario disponible
3. Crear kit automáticamente
4. Generar alerta si hay faltantes
5. Notificar a Logística

**Pseudocódigo:**
```typescript
async onSubmit() {
  // 1. Crear cirugía
  const cirugia = await this.cirugiasService.insertCirugia(this.form.value);
  
  // 2. Obtener productos estándar
  const productos = await this.obtenerProductosStandar(cirugia.tipo_cirugia_id);
  
  // 3. Validar inventario
  const validacion = await this.inventarioService.validarDisponibilidad(productos);
  
  // 4. Crear kit
  const kit = await this.kitService.createKit({
    cirugia_id: cirugia.id,
    estado: 'solicitado',
    comercial_id: this.userId
  });
  
  // 5. Agregar productos
  await this.kitService.agregarProductos(kit.id, productos);
  
  // 6. Alertas y notificaciones
  if (!validacion.completo) {
    await this.alertaService.crear('stock_insuficiente', validacion.faltantes);
  }
  
  await this.notificacionService.notificar(['logistica'], 'nuevo_kit_solicitado');
}
```

**Tiempo estimado:** 3-4 horas

---

## 🚀 FASE 2: APROBACIÓN Y PREPARACIÓN POR LOGÍSTICA

### TODO 2: Vista de Kits Pendientes
**Archivo:** `src/app/features/internal/logistica/kits-pendientes/kits-pendientes-list.component.ts`

**Objetivo:** Mostrar lista de kits con estado `solicitado` para que Logística apruebe

**Funcionalidad:**
- Listar kits pendientes
- Mostrar datos de cirugía y productos solicitados
- Validar stock disponible en tiempo real
- Botones: "Aprobar" | "Rechazar" | "Ver detalle"
- Al aprobar: cambiar estado a `alistándose`

**Template:**
```html
<div class="container mx-auto p-4">
  <h2>Kits Pendientes de Aprobación</h2>
  
  @for (kit of kitsPendientes(); track kit.id) {
    <div class="kit-card">
      <h3>{{ kit.numero_kit }}</h3>
      <p>Cirugía: {{ kit.cirugia.numero_cirugia }}</p>
      <p>Paciente: {{ kit.cirugia.paciente }}</p>
      <p>Fecha: {{ kit.cirugia.fecha_programada | date }}</p>
      
      <ul>
        @for (prod of kit.productos; track prod.id) {
          <li>
            {{ prod.nombre }} - Solicitado: {{ prod.cantidad_solicitada }}
            <span [class]="prod.stock_disponible >= prod.cantidad_solicitada ? 'text-green' : 'text-red'">
              (Stock: {{ prod.stock_disponible }})
            </span>
          </li>
        }
      </ul>
      
      <button (click)="aprobar(kit.id)">Aprobar</button>
      <button (click)="rechazar(kit.id)">Rechazar</button>
    </div>
  }
</div>
```

**Tiempo estimado:** 3-4 horas

---

### TODO 3: Preparación del Kit
**Archivo:** `src/app/features/internal/logistica/kit-preparacion/kit-preparacion.component.ts`

**Objetivo:** Interfaz para que Logística prepare físicamente el kit

**Funcionalidad:**
- Lista de productos del kit
- Checkboxes para marcar como preparado
- Inputs: lote, fecha_vencimiento, cantidad_preparada
- Validar contra inventario
- Al completar: estado → `preparado`
- Registrar movimientos de inventario (salida)

**Flujo:**
```typescript
async completarPreparacion() {
  // 1. Actualizar kit_productos
  await this.actualizarProductos();
  
  // 2. Registrar movimientos de inventario (salidas)
  await this.registrarMovimientos();
  
  // 3. Cambiar estado kit a 'preparado'
  await this.kitService.actualizarEstado(kitId, 'preparado');
  
  // 4. Notificar a Comercial y Técnico
  await this.notificar(['comercial', 'soporte_tecnico'], 'kit_preparado');
}
```

**Tiempo estimado:** 4-5 horas

---

## 🔧 SERVICIOS A CREAR

### 1. Inventario Service
**Archivo:** `src/app/shared/services/inventario.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class InventarioService {
  async getStockDisponible(productoId: string): Promise<number>
  async validarDisponibilidad(productos: ProductoRequerido[]): Promise<ValidacionInventario>
  async registrarMovimiento(movimiento: MovimientoInventario): Promise<void>
  async actualizarCantidad(productoId: string, cantidad: number, tipo: 'entrada' | 'salida'): Promise<void>
}
```

**Tiempo estimado:** 2-3 horas

---

### 2. Notificaciones Service
**Archivo:** `src/app/shared/services/notificaciones.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  async notificar(destinatarios: string[], tipo: string, datos?: any): Promise<void>
  async crearAlerta(tipo: string, mensaje: string, datos?: any): Promise<void>
}
```

**Tiempo estimado:** 2 horas

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### SQL a ejecutar:
```sql
-- Agregar estados faltantes
ALTER TABLE public.kits_cirugia
DROP CONSTRAINT IF EXISTS kits_cirugia_estado_check;

ALTER TABLE public.kits_cirugia
ADD CONSTRAINT kits_cirugia_estado_check 
CHECK (estado IN (
  'solicitado',
  'alistándose',        -- NUEVO ⚠️
  'preparando',
  'preparado',
  'despachado',
  'entregado',
  'en_uso',
  'pendiente_recogida', -- NUEVO ⚠️
  'recogido',
  'en_lavado',
  'disponible',
  'cancelado'
));
```

---

## ⏱️ ESTIMACIÓN DE TIEMPO

| Tarea | Tiempo |
|-------|--------|
| 1. Modificar cirugia-form para solicitar kit | 3-4h |
| 2. Crear kits-pendientes-list | 3-4h |
| 3. Crear kit-preparacion | 4-5h |
| 4. Crear inventario.service | 2-3h |
| 5. Crear notificaciones.service | 2h |
| 6. Extender kit.service | 2h |
| 7. Testing e integración | 3-4h |
| **TOTAL FASE 1-2** | **19-24 horas** |

---

## 🎯 PRÓXIMO PASO INMEDIATO

### Opción A: 🔴 SQL primero (5 min)
Actualizar constraint de estados en Supabase

### Opción B: 🟡 Servicios primero (4-5h)
Crear `inventario.service.ts` y `notificaciones.service.ts`

### Opción C: 🟢 Componentes primero (3-4h)
Empezar con `kits-pendientes-list.component.ts`

---

## ❓ DECISIONES PENDIENTES

1. **¿Crear productos estándar por tipo de cirugía?**
   - Opción A: Usar campo `productos_comunes` (jsonb) en `tipos_cirugia`
   - Opción B: Crear tabla relacional `tipo_cirugia_productos`

2. **¿Sistema de notificaciones?**
   - Opción A: Solo registros en BD (tabla `notificaciones`)
   - Opción B: Email/SMS con servicio externo
   - Opción C: Push notifications en app

3. **¿Validación de inventario estricta?**
   - Opción A: Bloquear creación si no hay stock
   - Opción B: Permitir con alerta pero no bloquear

---

## 📋 CHECKLIST ANTES DE EMPEZAR

- [ ] Ejecutar SQL para agregar estados faltantes
- [ ] Crear estructura de carpetas `logistica/`
- [ ] Actualizar routing en `internal-routing.ts`
- [ ] Crear interfaces TypeScript para tipos
- [ ] Configurar guard de rol `logistica`

---

## 🚀 ¿QUÉ PREFIERES QUE IMPLEMENTE PRIMERO?

**Responde con:**
- **"SQL"** → Actualizo constraint
- **"Servicios"** → Creo inventario.service y notificaciones.service
- **"Kits pendientes"** → Creo vista para Logística
- **"Todo desde cero"** → Empiezo por SQL, luego servicios, luego componentes

---

# PLAN ANTERIOR (Archivado)

### FASE 1: FUNDAMENTOS (Semanas 1-2)

#### 1.1 Dashboard Comercial Unificado
**Job:** Centralización de información comercial en tiempo real
**Componentes a crear:**
```
src/app/features/internal/dashboard/
├── dashboard-home.component.ts
├── widgets/
│   ├── ventas-widget/
│   ├── agenda-widget/
│   ├── inventario-widget/
│   └── alertas-widget/
└── services/
    └── dashboard.service.ts
```

**Funcionalidades:**
- Vista consolidada de ventas y facturación
- Indicadores de desempeño en tiempo real
- Alertas de cartera vencida y clientes inactivos
- Panel "¿Cómo voy hoy?"

#### 1.2 Sistema de Alertas Base
**Servicio:** `src/app/shared/services/alertas.service.ts`
**Funcionalidades:**
- Alertas de inventario bajo
- Vencimientos de productos
- Cirugías pendientes de facturación
- Retrasos en recogida de material

### FASE 2: TRAZABILIDAD (Semanas 3-4)

#### 2.1 Trazabilidad de Material Quirúrgico
**Job:** Seguimiento de principio a fin del ciclo logístico
**Componentes:**
```
src/app/features/internal/trazabilidad/
├── trazabilidad-material/
├── bitacora-digital/
└── estado-tiempo-real/
```

#### 2.2 Registro Digital de Hojas de Gasto
**Job:** Digitalización del proceso quirúrgico
**Funcionalidades:**
- Formulario móvil para registro en quirófano
- Validación automática
- Conexión directa con facturación

### FASE 3: OPTIMIZACIÓN LOGÍSTICA (Semanas 5-6)

#### 3.1 Geolocalización y Rutas
**Componentes:**
```
src/app/features/internal/logistica/
├── geolocalizacion/
├── rutas-optimizadas/
└── control-mensajeros/
```

#### 3.2 Dashboard Tipo "Aeropuerto"
**Funcionalidades:**
- Estado en tiempo real de despachos
- Indicadores de efectividad
- Control de entregas y recogidas

### FASE 4: INTEGRACIÓN Y COMUNICACIÓN (Semanas 7-8)

#### 4.1 Sistema de Comunicación Unificado
**Reemplazar:** WhatsApp, correos fragmentados
**Funcionalidades:**
- Canal asincrónico para quirófano
- Mensajería integrada por área
- Historial de comunicaciones

#### 4.2 Integración con ERP/CRM
**Conexiones:**
- Sincronización de inventario con SIESA
- Datos de clientes desde CRM
- Facturación automática

## ARQUITECTURA TÉCNICA RECOMENDADA

### Servicios Core Nuevos Requeridos:

1. **Real-time Service** (WebSockets/SignalR)
2. **Geolocation Service** (Google Maps API)
3. **Notification Service** (Push notifications)
4. **File Upload Service** (Imágenes de hojas de gasto)
5. **Integration Service** (ERP/CRM connections)

### Estructura de Base de Datos (Supabase):

#### Tablas principales a crear:
```sql
-- Trazabilidad
trazabilidad_material (id, equipo_id, estado, ubicacion, timestamp, responsable_id)
alertas (id, tipo, mensaje, prioridad, fecha_creacion, usuario_id)
rutas (id, mensajero_id, fecha, estado, coordenadas)
comunicaciones (id, emisor_id, receptor_id, mensaje, fecha, area)
hojas_gasto_digital (id, cirugia_id, consumos, imagenes, validado)

-- Dashboard
kpis_comercial (fecha, ventas, facturacion, clientes_activos)
kpis_logistico (fecha, entregas_tiempo, eficiencia_rutas, errores)
kpis_tecnico (fecha, cirugias_completadas, tiempo_promedio, incidencias)
```

## MÉTRICAS DE ÉXITO (KPIs)

### Comercial:
- Reducción 40% en tiempo de gestión de cotizaciones
- Incremento 25% en tasa de conversión
- Visibilidad 100% de agenda a 48 horas

### Logística:
- Reducción 60% en tiempo de coordinación de mensajeros
- Mejora 30% en eficiencia de rutas
- Eliminación 90% de errores por despachos incompletos

### Soporte Técnico:
- Reducción 70% en tiempo de registro de gastos
- Trazabilidad 100% de tiempo muerto
- Comunicación asincrónica 24/7 disponible

## TECNOLOGÍAS Y DEPENDENCIAS

### Nuevas dependencias a instalar:
```json
{
  "@angular/google-maps": "^19.0.0",
  "@angular/pwa": "^19.0.0",
  "socket.io-client": "^4.7.0",
  "ngx-qrcode2": "^12.0.0",
  "chart.js": "^4.4.0",
  "ng2-charts": "^6.0.0"
}
```

### APIs externas a integrar:
- Google Maps API (geolocalización)
- Google Cloud Storage (archivos)
- Pusher/Socket.io (tiempo real)
- SIESA API (ERP integration)

## CRONOGRAMA DETALLADO

### Semana 1-2: Dashboard y Alertas
- [ ] Crear dashboard comercial unificado
- [ ] Implementar sistema de alertas base
- [ ] Widgets de ventas y agenda

### Semana 3-4: Trazabilidad
- [ ] Módulo de trazabilidad de material
- [ ] Registro digital de hojas de gasto
- [ ] Bitácora digital de movimientos

### Semana 5-6: Logística Avanzada
- [ ] Geolocalización de mensajeros
- [ ] Dashboard tipo "aeropuerto"
- [ ] Optimización de rutas

### Semana 7-8: Integración
- [ ] Sistema de comunicación unificado
- [ ] Integración con SIESA ERP
- [ ] Pruebas de integración completa

## CONSIDERACIONES DE IMPLEMENTACIÓN

### 1. **Desarrollo Incremental**
- Implementar por Jobs específicos
- Validar cada módulo antes del siguiente
- Mantener funcionalidad existente

### 2. **Gestión del Cambio**
- Capacitación por área (Comercial, Logística, Técnica)
- Pilots controlados con usuarios clave
- Feedback iterativo

### 3. **Integración Híbrida**
- Mantener compatibilidad con procesos físicos
- Transición gradual de WhatsApp a plataforma unificada
- Respaldo de documentos físicos durante transición