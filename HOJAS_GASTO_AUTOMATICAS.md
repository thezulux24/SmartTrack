# GENERACIÓN AUTOMÁTICA DE HOJAS DE GASTO

## 📋 Descripción General

Al finalizar una cirugía, el sistema ahora crea automáticamente una **Hoja de Gasto** pre-poblada con todos los productos que fueron realmente utilizados durante el procedimiento quirúrgico.

---

## 🎯 Objetivo

- **Automatizar** la creación de hojas de gasto basadas en consumo real
- **Eliminar** la necesidad de transcripción manual de productos utilizados
- **Facilitar** el trabajo del operador logístico, quien solo necesita agregar gastos adicionales (transporte, etc.)
- **Garantizar** que solo los productos efectivamente consumidos se facturen

---

## ⚡ Flujo de Trabajo

```
┌─────────────────────────────────────────────────────────────────┐
│                    EJECUCIÓN DE CIRUGÍA                          │
│  - Técnico registra consumo en tiempo real                      │
│  - cantidad_utilizada se actualiza por cada producto            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│             TÉCNICO: Finalizar Cirugía (Botón)                  │
│  - Confirma que la cirugía ha terminado                         │
│  - Sistema pregunta: "¿Finalizar cirugía?"                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESO AUTOMÁTICO                            │
│                                                                  │
│  1️⃣ Cirugía → estado: 'completada'                               │
│  2️⃣ Kit → estado: 'devuelto'                                     │
│  3️⃣ ⭐ CREAR HOJA DE GASTO AUTOMÁTICA ⭐                          │
│     • Filtrar productos con cantidad_utilizada > 0              │
│     • Obtener precio de cada producto desde BD                  │
│     • Crear hoja_gasto con estado: 'borrador'                   │
│     • Insertar hoja_gasto_items (categoría: 'productos')        │
│  4️⃣ Registrar trazabilidad                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          OPERADOR LOGÍSTICO: Completar Hoja de Gasto            │
│  - Ve hoja de gasto en estado 'borrador'                        │
│  - Productos utilizados ya están registrados ✅                  │
│  - Agrega gastos adicionales:                                   │
│    * Transporte (categoria: 'transporte')                       │
│    * Otros gastos (categoria: 'otros')                          │
│  - Cambia estado a 'revision' cuando esté completa              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SUPERVISOR: Aprobar Hoja de Gasto                  │
│  - Revisa todos los ítems                                       │
│  - Cambia estado a 'aprobada'                                   │
│  - Lista para facturación                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Implementación Técnica

### Ubicación del Código
**Archivo**: `cirugia-ejecucion.component.ts`  
**Función**: `finalizarCirugia()`

### Imports Necesarios
```typescript
import { HojaGastoService } from '../../hojas-gasto/data-access/hoja-gasto.service';
import { CreateHojaGastoRequest, HojaGastoItem } from '../../hojas-gasto/data-access/hoja-gasto.model';
```

### Inyección del Servicio
```typescript
private hojaGastoService = inject(HojaGastoService);
```

### Lógica Principal

#### 1. Filtrar Productos Utilizados
```typescript
const productosUtilizados = this.productos().filter(p => p.cantidad_utilizada > 0);
```

**Regla de Negocio**: Solo productos con `cantidad_utilizada > 0` se incluyen en la hoja de gasto.

#### 2. Obtener Precios desde Base de Datos
```typescript
const productosConPrecio: Omit<HojaGastoItem, 'hoja_gasto_id'>[] = await Promise.all(
  productosUtilizados.map(async (producto) => {
    const { data: productoData } = await this.supabase.client
      .from('productos')
      .select('precio')
      .eq('id', producto.producto_id)
      .single();

    const precio = productoData?.precio || 0;
    
    return {
      producto_id: producto.producto_id,
      categoria: 'productos' as const,
      descripcion: `${producto.nombre} (${producto.codigo})`,
      cantidad: producto.cantidad_utilizada,
      precio_unitario: precio,
      precio_total: precio * producto.cantidad_utilizada,
      observaciones: `Lote: ${producto.lote || 'N/A'}${producto.fecha_vencimiento ? ' - Venc: ' + producto.fecha_vencimiento : ''}`
    };
  })
);
```

**Características**:
- Consulta precio actual del producto en la tabla `productos`
- Calcula `precio_total = precio_unitario * cantidad`
- Incluye información de lote y fecha de vencimiento en observaciones

#### 3. Crear Request de Hoja de Gasto
```typescript
const createHojaGastoRequest: CreateHojaGastoRequest = {
  cirugia_id: cirugia.id,
  tecnico_id: currentUserId,
  fecha_cirugia: new Date(cirugia.fecha_programada).toISOString().split('T')[0],
  observaciones: `Hoja de gasto generada automáticamente al finalizar la cirugía ${cirugia.numero_cirugia}`,
  items: productosConPrecio as HojaGastoItem[]
};
```

#### 4. Llamar al Servicio (Observable)
```typescript
this.hojaGastoService.createHojaGasto(createHojaGastoRequest).subscribe({
  next: (hojaCreada) => {
    console.log('✅ Hoja de gasto creada automáticamente:', hojaCreada);
  },
  error: (error) => {
    console.error('⚠️ Error al crear hoja de gasto automática:', error);
    // No detenemos el proceso por un error en la hoja de gasto
  }
});
```

**Nota Importante**: La creación de la hoja de gasto no es bloqueante. Si falla, la cirugía se marca como completada de todos modos.

---

## 📊 Estructura de la Hoja de Gasto Creada

### Tabla: `hojas_gasto`

| Campo | Valor |
|-------|-------|
| `numero_hoja` | Auto-generado (ej: "HG-2025-001") |
| `cirugia_id` | ID de la cirugía |
| `tecnico_id` | ID del usuario que finalizó la cirugía |
| `fecha_cirugia` | Fecha programada de la cirugía |
| `estado` | `'borrador'` |
| `total_productos` | Suma de precios de productos utilizados |
| `total_transporte` | `0` (se completará por logística) |
| `total_otros` | `0` (se completará por logística) |
| `total_general` | `total_productos` (se actualizará) |
| `observaciones` | "Hoja de gasto generada automáticamente..." |

### Tabla: `hoja_gasto_items`

Para cada producto utilizado:

| Campo | Valor |
|-------|-------|
| `hoja_gasto_id` | ID de la hoja creada |
| `producto_id` | ID del producto |
| `categoria` | `'productos'` |
| `descripcion` | "Nombre del Producto (CODIGO)" |
| `cantidad` | `cantidad_utilizada` |
| `precio_unitario` | Precio desde tabla `productos` |
| `precio_total` | `cantidad * precio_unitario` |
| `observaciones` | "Lote: XXX - Venc: YYYY-MM-DD" |

---

## 🎨 Mensaje al Usuario

Cuando la cirugía se finaliza exitosamente:

```
✅ Cirugía finalizada correctamente

📋 Hoja de gasto creada automáticamente con 5 producto(s) utilizado(s)

📦 Próximos pasos:
1. Validar devolución del kit
2. Separar productos usados/sin usar
3. Enviar productos reutilizables a limpieza/esterilización
4. Actualizar inventario

El personal logístico puede agregar gastos adicionales (transporte, etc.) 
en el módulo de Hojas de Gasto.
```

---

## 🔍 Validaciones y Casos Especiales

### Caso 1: No hay productos utilizados
```typescript
if (productosUtilizados.length > 0) {
  // Crear hoja de gasto
} else {
  console.log('⚠️ No hay productos utilizados, no se creará hoja de gasto');
}
```

**Resultado**: No se crea hoja de gasto si todos los productos tienen `cantidad_utilizada = 0`.

### Caso 2: Error al crear hoja de gasto
```typescript
error: (error) => {
  console.error('⚠️ Error al crear hoja de gasto automática:', error);
  // No detenemos el proceso por un error en la hoja de gasto
}
```

**Resultado**: La cirugía se completa exitosamente aunque falle la creación de la hoja. Se registra el error en consola.

### Caso 3: Ya existe hoja de gasto para la cirugía

El servicio `HojaGastoService` valida esto automáticamente:

```typescript
const { data: existingHoja, error: checkError } = await this.supabase.client
  .from('hojas_gasto')
  .select('id, numero_hoja, estado')
  .eq('cirugia_id', request.cirugia_id)
  .limit(1);

if (existingHoja && existingHoja.length > 0) {
  throw new Error(`Ya existe una hoja de gasto (${hojaExistente.numero_hoja}) para esta cirugía.`);
}
```

**Resultado**: No se permite crear hojas de gasto duplicadas para la misma cirugía.

---

## 📈 Trazabilidad

Se registra en `cirugia_trazabilidad`:

```typescript
{
  cirugia_id: cirugia.id,
  accion: 'finalizacion_cirugia',
  estado_anterior: 'en_curso',
  estado_nuevo: 'completada',
  usuario_id: currentUserId,
  observaciones: `Cirugía finalizada - Kit listo para devolución - Hoja de gasto creada automáticamente con ${productosUtilizados.length} productos utilizados`,
  metadata: {
    kit_id: cirugia.kit.id,
    productos_utilizados: this.productosUtilizados(),
    total_productos: this.totalProductos(),
    hoja_gasto_creada: productosUtilizados.length > 0 // ⭐ Nuevo campo
  }
}
```

---

## 🎯 Beneficios

### Para el Técnico Quirúrgico
✅ No necesita crear manualmente la hoja de gasto  
✅ Proceso de finalización más rápido  
✅ Menos posibilidad de olvidos

### Para el Operador Logístico
✅ Recibe hoja pre-poblada con productos utilizados  
✅ Solo necesita agregar gastos de transporte y otros  
✅ Información de lote y vencimiento ya incluida  
✅ Precios actualizados automáticamente

### Para la Organización
✅ Registro preciso del consumo real  
✅ Trazabilidad completa desde cirugía hasta facturación  
✅ Reducción de errores de transcripción  
✅ Aceleración del proceso de facturación

---

## 🧪 Testing Checklist

- [ ] **Caso 1**: Cirugía con 5 productos utilizados → Hoja de gasto con 5 ítems
- [ ] **Caso 2**: Cirugía con 0 productos utilizados → No se crea hoja de gasto
- [ ] **Caso 3**: Cirugía con productos mixtos (3 usados, 2 sin usar) → Hoja con 3 ítems
- [ ] **Caso 4**: Verificar que precios se obtienen correctamente desde tabla `productos`
- [ ] **Caso 5**: Verificar cálculo correcto de `precio_total`
- [ ] **Caso 6**: Verificar que observaciones incluyen lote y fecha de vencimiento
- [ ] **Caso 7**: Verificar que hoja se crea con estado `'borrador'`
- [ ] **Caso 8**: Verificar que `total_productos` se calcula correctamente
- [ ] **Caso 9**: Intentar finalizar la misma cirugía dos veces → Error de duplicación
- [ ] **Caso 10**: Verificar que error en hoja de gasto no detiene finalización de cirugía
- [ ] **Caso 11**: Logística puede agregar items de transporte a la hoja creada
- [ ] **Caso 12**: Trazabilidad registra `hoja_gasto_creada: true/false`

---

## 🔗 Archivos Modificados

### TypeScript:
- **`cirugia-ejecucion.component.ts`**
  - Imports: `HojaGastoService`, `CreateHojaGastoRequest`, `HojaGastoItem`
  - Inyección: `private hojaGastoService = inject(HojaGastoService)`
  - Función modificada: `finalizarCirugia()` - Agrega lógica de creación automática

### Sin cambios en:
- HTML (la UI ya existente funciona correctamente)
- Modelos (se reutilizan los existentes)
- Servicios de hojas de gasto (funcionan sin modificación)

---

## 📋 Próximos Pasos Sugeridos

1. **Notificaciones**: Agregar notificación al operador logístico cuando se crea una nueva hoja de gasto
2. **Dashboard**: Mostrar hojas de gasto en estado "borrador" en un widget del dashboard logístico
3. **Reportes**: Incluir estadísticas de hojas de gasto generadas automáticamente vs manuales
4. **Validaciones**: Agregar regla de negocio que no permita finalizar cirugía sin registrar al menos 1 producto utilizado (si es necesario)

---

**Fecha de Implementación**: Enero 2025  
**Versión**: FASE 4 - Ejecución Quirúrgica con Hojas de Gasto Automáticas  
**Estado**: ✅ Implementado y Listo para Testing
