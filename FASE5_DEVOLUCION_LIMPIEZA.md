# FASE 5: Devolución y Limpieza - Documentación Completa

## 📋 Resumen

La **FASE 5** implementa el proceso completo de devolución, limpieza, esterilización y recuperación de productos quirúrgicos al inventario después de una cirugía. Este es el paso final en el ciclo de vida de un kit quirúrgico.

## 🔄 Flujo Completo del Proceso

### Estados del Kit
```
devuelto → en_limpieza → finalizado
```

### Ciclo de Vida Completo de un Kit
```
1. preparando (Comercial prepara el kit)
2. listo_envio (Kit listo para envío)
3. en_transito (Mensajero en camino)
4. entregado (Cliente recibió el kit)
5. validado (Técnico validó recepción) ✅ FASE 3
6. en_uso (Cirugía en curso) ✅ FASE 4
7. devuelto (Kit devuelto post-cirugía) ✅ FASE 4
8. en_limpieza (Procesando limpieza) ✅ FASE 5
9. finalizado (Ciclo completo) ✅ FASE 5
```

## 🏗️ Arquitectura de la Solución

### 1. Componentes Creados

#### 📦 **tecnico-procesar-devolucion.component**
- **Ruta:** `/internal/tecnico/procesar-devolucion/:kitId`
- **Usuario:** Técnico
- **Función:** Clasificar productos devueltos

**Características:**
- Lista todos los productos del kit con cantidades (enviada, utilizada, disponible)
- Toggle para marcar cada producto como **Desechable** o **Reutilizable**
- Ajustar cantidad a recuperar con botones +/-
- Campo de notas para observaciones
- KPIs en tiempo real (Total, Desechables, Reutilizables, A Recuperar)

**Proceso:**
1. Carga kit en estado `devuelto`
2. Muestra productos con cantidades disponibles
3. Usuario clasifica cada producto
4. Al confirmar:
   - Actualiza `kit_productos` con `cantidad_recuperable`, `es_desechable`, `notas_devolucion`
   - Crea registros en `kit_productos_limpieza` para tracking
   - Cambia kit a estado `en_limpieza`
   - Registra en `cirugia_trazabilidad`

---

#### 🧼 **limpieza-dashboard.component**
- **Ruta:** `/internal/limpieza`
- **Usuario:** Personal de Limpieza
- **Función:** Procesar limpieza y esterilización

**Características:**
- Lista de kits en estado `en_limpieza`
- KPIs: Total Kits, Pendientes, En Proceso, Esterilizados
- Modal detallado por kit mostrando productos reutilizables
- Campo de observaciones para cada producto
- Botones de acción según estado del producto:
  - **Pendiente** → "Iniciar Proceso" → `en_proceso`
  - **En Proceso** → "Marcar como Esterilizado" → `esterilizado`
  - **Esterilizado** → "Listo para Aprobación" (read-only)

**Estados de Productos:**
- `pendiente` → Esperando limpieza
- `en_proceso` → En limpieza/esterilización
- `esterilizado` → Completado y listo para supervisión
- `aprobado` → Aprobado por supervisor (siguiente componente)

---

#### ✅ **aprobacion-limpieza.component**
- **Ruta:** `/internal/limpieza/aprobacion`
- **Usuario:** Supervisor
- **Función:** Aprobar limpieza y actualizar inventario

**Características:**
- Muestra solo kits con productos en estado `esterilizado`
- KPIs: Kits Listos, Productos Esterilizados
- Modal de aprobación con ajuste de cantidades finales
- Botones +/- para ajustar `cantidad_aprobada` (por defecto igual a `cantidad_a_recuperar`)
- Proceso de aprobación incluye:

**Al Aprobar un Kit:**
1. Actualiza `kit_productos_limpieza`:
   - `estado_limpieza` = `aprobado`
   - `cantidad_aprobada` (ajustada por supervisor)
   - `aprobado_por`, `fecha_aprobacion`

2. Actualiza Inventario:
   - Busca registro existente en `inventario` por `producto_id`
   - Si existe: suma `cantidad_aprobada` al `cantidad` actual
   - Si no existe: crea nuevo registro con `cantidad_aprobada`
   - Crea registro en `movimientos_inventario` (tipo: `entrada`)

3. Finaliza Kit:
   - `kits_cirugia.estado` = `finalizado`
   - `fecha_fin_limpieza`, `limpieza_aprobada_por`, `fecha_aprobacion_limpieza`
   - Registra en `cirugia_trazabilidad`

---

### 2. Base de Datos - Schema Updates

#### SQL Migration: `fase5_devolucion_limpieza_schema.sql`

**Nuevas Columnas en `kit_productos`:**
```sql
- cantidad_recuperable INTEGER (Cantidad que puede ser recuperada)
- es_desechable BOOLEAN (Si fue marcado como desechable)
- notas_devolucion TEXT (Observaciones del técnico)
```

**Nuevas Columnas en `kits_cirugia`:**
```sql
- fecha_inicio_limpieza TIMESTAMP
- fecha_fin_limpieza TIMESTAMP
- limpieza_aprobada_por UUID (FK a auth.users)
- fecha_aprobacion_limpieza TIMESTAMP
```

**Nuevo Estado en CHECK Constraint:**
```sql
ALTER TABLE kits_cirugia ADD CONSTRAINT kits_cirugia_estado_check 
CHECK (estado IN (
  'solicitado', 'preparando', 'listo_envio', 'en_transito', 
  'entregado', 'validado', 'en_uso', 'devuelto', 
  'en_limpieza',  -- ✨ NUEVO
  'finalizado', 'cancelado'
));
```

**Nueva Tabla: `kit_productos_limpieza`**
```sql
CREATE TABLE kit_productos_limpieza (
  id UUID PRIMARY KEY,
  kit_producto_id UUID REFERENCES kit_productos(id),
  kit_id UUID REFERENCES kits_cirugia(id),
  producto_id UUID REFERENCES productos(id),
  
  estado_limpieza TEXT CHECK (estado_limpieza IN (
    'pendiente', 'en_proceso', 'esterilizado', 'aprobado', 'desechado'
  )),
  
  cantidad_a_recuperar INTEGER,
  cantidad_aprobada INTEGER,
  es_desechable BOOLEAN,
  notas TEXT,
  observaciones_limpieza TEXT,
  
  procesado_por UUID REFERENCES auth.users(id),
  fecha_inicio_proceso TIMESTAMP,
  fecha_fin_proceso TIMESTAMP,
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Índices para Performance:**
```sql
CREATE INDEX idx_kit_productos_limpieza_kit_id ON kit_productos_limpieza(kit_id);
CREATE INDEX idx_kit_productos_limpieza_estado ON kit_productos_limpieza(estado_limpieza);
CREATE INDEX idx_kits_cirugia_en_limpieza ON kits_cirugia(estado) WHERE estado = 'en_limpieza';
```

---

### 3. Rutas Configuradas

**Técnico:**
```typescript
/internal/tecnico/procesar-devolucion/:kitId
```

**Limpieza:**
```typescript
/internal/limpieza                    // Dashboard de limpieza
/internal/limpieza/aprobacion         // Aprobación y finalización
```

**Routing Files Updated:**
- `tecnico-routing.ts`
- `limpieza-routing.ts` (nuevo)
- `internal-routing.ts` (agregado ruta limpieza)

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 4: Finalizar Cirugía                                      │
│ - Kit estado: devuelto                                         │
│ - Fecha_devolucion registrada                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ TÉCNICO: Procesar Devolución                                   │
│ Componente: tecnico-procesar-devolucion                        │
│ /internal/tecnico/procesar-devolucion/:kitId                   │
│                                                                 │
│ Acciones:                                                       │
│ 1. Ver productos con cantidades (enviada, utilizada, disponible)│
│ 2. Clasificar: ♻️ Reutilizable o 🗑️ Desechable               │
│ 3. Ajustar cantidad_a_recuperar                                │
│ 4. Agregar notas                                                │
│ 5. Confirmar procesamiento                                      │
│                                                                 │
│ Resultado:                                                      │
│ - kit_productos: actualizado con clasificación                  │
│ - kit_productos_limpieza: registros creados (solo reutilizables)│
│ - kit estado → en_limpieza                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ LIMPIEZA: Proceso de Esterilización                            │
│ Componente: limpieza-dashboard                                 │
│ /internal/limpieza                                              │
│                                                                 │
│ Productos Reutilizables:                                        │
│ pendiente → en_proceso → esterilizado                          │
│                                                                 │
│ Acciones por Producto:                                          │
│ 1. Iniciar Proceso (pendiente → en_proceso)                    │
│ 2. Agregar observaciones_limpieza                              │
│ 3. Marcar como Esterilizado (en_proceso → esterilizado)       │
│                                                                 │
│ Estado Kit: en_limpieza (sin cambios)                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ SUPERVISOR: Aprobación y Finalización                          │
│ Componente: aprobacion-limpieza                                │
│ /internal/limpieza/aprobacion                                   │
│                                                                 │
│ Acciones:                                                       │
│ 1. Revisar productos esterilizados                             │
│ 2. Ajustar cantidad_aprobada (si necesario)                    │
│ 3. Aprobar Kit                                                  │
│                                                                 │
│ Al Aprobar:                                                     │
│ 1. kit_productos_limpieza → aprobado                           │
│ 2. INVENTARIO actualizado:                                      │
│    - Suma cantidad_aprobada a inventario                        │
│    - Crea movimiento_inventario (entrada)                       │
│ 3. kit estado → finalizado ✅                                  │
│ 4. Registra trazabilidad completa                              │
│                                                                 │
│ 🎉 CICLO DE VIDA DEL KIT COMPLETO                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Casos de Uso

### Caso 1: Kit con Productos Mixtos
**Escenario:** Kit tiene 10 productos, 3 fueron totalmente usados, 4 parcialmente usados, 3 sin usar

**Proceso:**
1. **Técnico clasifica:**
   - 3 totalmente usados → Desechable
   - 4 parcialmente usados → Reutilizable (cantidad disponible ajustada)
   - 3 sin usar → Reutilizable (cantidad completa)

2. **Limpieza procesa:**
   - Solo ve 7 productos reutilizables (4+3)
   - Marca cada uno: pendiente → en_proceso → esterilizado

3. **Supervisor aprueba:**
   - Revisa los 7 esterilizados
   - Puede ajustar cantidades si detecta daños
   - Aprueba → 7 productos regresan a inventario
   - Kit marcado como finalizado

---

### Caso 2: Kit Totalmente Desechable
**Escenario:** Todos los productos fueron usados completamente

**Proceso:**
1. **Técnico:** Marca todos como Desechable, cantidad_a_recuperar = 0
2. **Limpieza:** No aparece ningún producto (filtro: no desechables)
3. **Supervisor:** Kit no aparece (filtro: solo kits con esterilizados)
4. **Manual:** Admin debe cambiar kit a 'finalizado' desde otro módulo

> **Nota:** Considerar agregar botón "Finalizar Sin Recuperación" en tecnico-procesar-devolucion

---

### Caso 3: Rechazo Parcial en Aprobación
**Escenario:** 5 productos esterilizados, 1 tiene daño detectado en supervisión

**Proceso:**
1. **Supervisor:** 
   - 4 productos → cantidad_aprobada = cantidad_a_recuperar
   - 1 producto dañado → cantidad_aprobada = 0 (ajustar con botones -)
2. **Sistema:** Solo regresa al inventario los 4 aprobados
3. **Kit:** Marcado como finalizado de todas formas

---

## 🔐 Permisos y Roles

| Componente | Rol Requerido | Ruta |
|------------|--------------|------|
| Procesar Devolución | `soporte_tecnico` | `/internal/tecnico/procesar-devolucion/:kitId` |
| Limpieza Dashboard | `limpieza` / `admin` | `/internal/limpieza` |
| Aprobación Limpieza | `admin` / `supervisor` | `/internal/limpieza/aprobacion` |

> **Importante:** Implementar guards de autorización según roles en producción

---

## 📈 KPIs y Métricas

### Dashboard Técnico - Kits Devueltos
- Total de kits devueltos pendientes de procesar
- Botón naranja "Procesar Devolución" habilitado

### Procesar Devolución
- Total Productos
- Total Desechables
- Total Reutilizables
- Cantidad Total a Recuperar

### Limpieza Dashboard
- Total Kits en Limpieza
- Productos Pendientes
- Productos En Proceso
- Productos Esterilizados

### Aprobación Limpieza
- Kits Listos para Aprobación
- Productos Esterilizados Totales

---

## 🧪 Testing Recomendado

### 1. Prueba de Flujo Completo
```
1. Crear kit → Enviar → Entregar → Validar
2. Iniciar Cirugía → Consumir productos → Finalizar
3. Dashboard Técnico → Ver en "Kits Devueltos"
4. Clic "Procesar Devolución"
5. Clasificar productos (algunos desechables, otros reutilizables)
6. Confirmar → Kit pasa a "en_limpieza"
7. /internal/limpieza → Ver kit listado
8. Clic en kit → Modal → Iniciar proceso en cada producto
9. Marcar como Esterilizado
10. /internal/limpieza/aprobacion → Ver kit listo
11. Aprobar → Verificar inventario actualizado
12. Kit debe estar en estado "finalizado"
```

### 2. Validaciones de Base de Datos
```sql
-- Verificar estado de kit
SELECT estado FROM kits_cirugia WHERE numero_kit = 'KIT-XXX';

-- Verificar productos de limpieza
SELECT * FROM kit_productos_limpieza WHERE kit_id = 'uuid-del-kit';

-- Verificar actualización de inventario
SELECT cantidad FROM inventario WHERE producto_id = 'uuid-producto';

-- Verificar movimientos de inventario
SELECT * FROM movimientos_inventario 
WHERE motivo LIKE '%Recuperación de kit%' 
ORDER BY fecha DESC;
```

---

## 🚀 Instalación y Deployment

### 1. Ejecutar Migration SQL
```bash
# En Supabase SQL Editor, ejecutar:
fase5_devolucion_limpieza_schema.sql
```

### 2. Verificar Componentes Creados
```
src/app/features/internal/
├── tecnico/
│   └── tecnico-procesar-devolucion/
│       ├── tecnico-procesar-devolucion.component.ts
│       ├── tecnico-procesar-devolucion.component.html
│       └── tecnico-procesar-devolucion.component.css
└── limpieza/
    ├── limpieza-dashboard/
    │   ├── limpieza-dashboard.component.ts
    │   ├── limpieza-dashboard.component.html
    │   └── limpieza-dashboard.component.css
    ├── aprobacion-limpieza/
    │   ├── aprobacion-limpieza.component.ts
    │   ├── aprobacion-limpieza.component.html
    │   └── aprobacion-limpieza.component.css
    └── limpieza-routing.ts
```

### 3. Compilar Proyecto
```bash
npm run build
# o
ng serve
```

---

## 📝 Notas Importantes

1. **Desechables vs Reutilizables:** 
   - Los productos desechables NO aparecen en limpieza ni aprobación
   - Solo se crean registros en `kit_productos_limpieza` para reutilizables

2. **Trazabilidad Completa:**
   - Cada paso registra en `cirugia_trazabilidad`
   - Metadata incluye detalles de productos y cantidades

3. **Estados Intermedios:**
   - Un kit puede estar en `en_limpieza` por días/semanas
   - Los productos pueden estar en diferentes estados de limpieza

4. **Ajustes de Cantidad:**
   - Supervisor puede reducir cantidad_aprobada si detecta daños
   - Nunca puede aprobar más de cantidad_a_recuperar

5. **Inventario:**
   - Se actualiza SOLO en aprobación final
   - Busca primero registro existente antes de crear nuevo
   - Registra movimiento para auditoría

---

## 🔮 Mejoras Futuras

### Corto Plazo
- [ ] Botón "Finalizar Sin Recuperación" para kits 100% desechables
- [ ] Notificaciones automáticas cuando kit llega a limpieza
- [ ] Dashboard con tiempos promedio de limpieza

### Mediano Plazo
- [ ] QR Scanner para marcar productos en limpieza
- [ ] Fotos del estado de productos esterilizados
- [ ] Reportes de tasa de recuperación por producto/cirugía

### Largo Plazo
- [ ] Integración con sistema de esterilización automática
- [ ] Machine Learning para predecir productos desechables
- [ ] Blockchain para trazabilidad certificada

---

## 🆘 Troubleshooting

### Error: "kit_productos_limpieza table does not exist"
**Solución:** Ejecutar `fase5_devolucion_limpieza_schema.sql`

### Error: "estado 'en_limpieza' not allowed"
**Solución:** Ejecutar la parte del script que actualiza el CHECK constraint

### Kit no aparece en Limpieza Dashboard
**Verificar:**
1. Kit está en estado `en_limpieza`
2. Existen productos con `es_desechable = false`
3. Registros creados en `kit_productos_limpieza`

### Kit no aparece en Aprobación
**Verificar:**
1. Productos tienen `estado_limpieza = 'esterilizado'`
2. Filtro correcto en query de aprobacion-limpieza component

### Inventario no se actualiza
**Verificar:**
1. Tabla `inventario` tiene permisos de INSERT/UPDATE
2. `producto_id` existe en tabla `productos`
3. Revisar logs de consola para errores específicos

---

## 📞 Contacto y Soporte

Para dudas sobre FASE 5:
- Revisar código en `/src/app/features/internal/limpieza/`
- Consultar migration SQL: `fase5_devolucion_limpieza_schema.sql`
- Revisar trazabilidad en tabla `cirugia_trazabilidad`

---

## ✅ Checklist de Implementación

- [x] Componente tecnico-procesar-devolucion creado
- [x] Componente limpieza-dashboard creado
- [x] Componente aprobacion-limpieza creado
- [x] Routing configurado
- [x] Migration SQL creada
- [x] Tabla kit_productos_limpieza definida
- [x] Botón "Procesar Devolución" habilitado
- [x] Estados de limpieza implementados
- [x] Actualización de inventario funcional
- [x] Trazabilidad completa registrada
- [ ] Testing end-to-end realizado
- [ ] Migration ejecutada en Supabase
- [ ] Guards de autorización implementados (recomendado)

---

**Versión:** 1.0  
**Fecha:** 2025-01-08  
**Autor:** Sistema SmartTrack - FASE 5 Implementation  
**Estado:** ✅ Código Completo - Pendiente Testing y Deployment
