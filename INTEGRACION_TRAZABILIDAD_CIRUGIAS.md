# 🎯 Integración de Trazabilidad en Creación de Cirugías

## ✅ Cambios Realizados

### 1. Servicio de Cirugías Actualizado

**Archivo:** `cirugias.service.ts`

#### Importaciones Agregadas
```typescript
import { TrazabilidadService } from '../../../../shared/services/trazabilidad.service';
```

#### Constructor Actualizado
```typescript
constructor(
  private supabase: SupabaseService,
  private trazabilidadService: TrazabilidadService
) {}
```

### 2. Registro Automático al Crear Cirugía

**Método:** `createCirugia()`

Ahora cuando se crea una cirugía:

1. ✅ Se inserta en la tabla `cirugias`
2. ✅ Se registra automáticamente en `cirugia_trazabilidad`:
   - **Acción:** `cirugia_creada`
   - **Estado nuevo:** `programada` (o el estado que tenga la cirugía)
   - **Observaciones:** "Cirugía CIR-XXX creada - Tipo de cirugía"
   - **Metadata:** Incluye:
     - `numero_cirugia`
     - `tipo_cirugia`
     - `hospital`
     - `fecha_programada`

**Comportamiento:**
- Si falla la trazabilidad, **NO falla la creación** de la cirugía
- Se loguea el error pero continúa el flujo normal
- La cirugía se crea exitosamente en todos los casos

### 3. Registro Automático al Cambiar Estado

**Método:** `updateEstado()`

Anteriormente usaba la tabla obsoleta `cirugia_seguimiento`. Ahora:

1. ✅ Obtiene el estado anterior de la cirugía
2. ✅ Actualiza el estado en la tabla `cirugias`
3. ✅ Registra en `cirugia_trazabilidad`:
   - **Acción:** `estado_cambiado`
   - **Estado anterior:** Estado previo
   - **Estado nuevo:** Nuevo estado
   - **Observaciones:** Comentario personalizado o mensaje automático
   - **Metadata:** Incluye `numero_cirugia`

**Comportamiento:**
- Si falla la trazabilidad, **NO falla la actualización** del estado
- Se loguea el error pero continúa el flujo normal

## 📊 Ejemplo de Uso

### Crear Cirugía

```typescript
// Componente llama:
cirugiaService.createCirugia({
  numero_cirugia: 'CIR-2025-001',
  tipo_cirugia_id: 'uuid-tipo',
  hospital_id: 'uuid-hospital',
  cliente_id: 'uuid-cliente',
  medico_cirujano: 'Dr. Juan Pérez',
  fecha_programada: '2025-02-01T10:00:00Z',
  estado: 'programada' // Opcional, por defecto es 'programada'
}).subscribe();

// Automáticamente se crea:
// 1. Registro en 'cirugias'
// 2. Registro en 'cirugia_trazabilidad':
{
  cirugia_id: 'uuid-cirugia',
  accion: 'cirugia_creada',
  estado_nuevo: 'programada',
  observaciones: 'Cirugía CIR-2025-001 creada - Reemplazo de cadera',
  usuario_id: 'uuid-usuario-actual',
  timestamp: '2025-01-29T10:00:00Z',
  metadata: {
    numero_cirugia: 'CIR-2025-001',
    tipo_cirugia: 'Reemplazo de cadera',
    hospital: 'Hospital ABC',
    fecha_programada: '2025-02-01T10:00:00Z'
  }
}
```

### Cambiar Estado

```typescript
// Componente llama:
cirugiaService.updateEstado(
  'uuid-cirugia',
  'en_proceso',
  'Paciente ingresado al quirófano'
).subscribe();

// Automáticamente se registra en 'cirugia_trazabilidad':
{
  cirugia_id: 'uuid-cirugia',
  accion: 'estado_cambiado',
  estado_anterior: 'programada',
  estado_nuevo: 'en_proceso',
  observaciones: 'Paciente ingresado al quirófano',
  usuario_id: 'uuid-usuario-actual',
  timestamp: '2025-02-01T10:05:00Z',
  metadata: {
    numero_cirugia: 'CIR-2025-001'
  }
}
```

## 🔍 Verificación en la App

### En el Módulo de Trazabilidad

1. Ir a `/internal/trazabilidad`
2. Buscar la cirugía recién creada
3. Clic en la cirugía
4. Ver el timeline:

```
📋 Historial de Actividad de CIR-2025-001

➕ Cirugía Creada
   Estado: programada
   Hace 2 minutos
   👤 Juan Pérez (Comercial)
   💬 Cirugía CIR-2025-001 creada - Reemplazo de cadera
   📍 Hospital ABC
```

### En Kit Detail

Cuando se vea el detalle de un kit asociado a esta cirugía, el timeline mostrará:
- Eventos de la cirugía (creación, cambios de estado)
- Eventos de todos los kits asociados
- Todo en orden cronológico

## 🎨 Estados de Cirugía

Según el esquema de la base de datos, el estado por defecto es **`programada`**:

```sql
estado character varying DEFAULT 'programada'::character varying
```

Posibles estados (según tu flujo):
- `programada` - Estado inicial al crear
- `en_proceso` - Durante la cirugía
- `finalizada` - Cirugía completada
- `cancelada` - Cirugía cancelada
- `facturada` - Proceso completo

## 🚀 Próximos Pasos

### 1. Agregar Más Eventos de Trazabilidad

Puedes agregar registros en otros métodos:

```typescript
// Cuando se asigna técnico
asignarTecnico(cirugiaId: string, tecnicoId: string) {
  // ... lógica de asignación ...
  
  this.trazabilidadService.registrarEventoCirugia({
    cirugia_id: cirugiaId,
    accion: 'tecnico_asignado',
    estado_nuevo: estado_actual,
    observaciones: `Técnico ${tecnico.full_name} asignado`,
    metadata: { tecnico_id: tecnicoId }
  }).subscribe();
}

// Cuando se reprograma
reprogramarCirugia(cirugiaId: string, nuevaFecha: string) {
  // ... lógica de reprogramación ...
  
  this.trazabilidadService.registrarEventoCirugia({
    cirugia_id: cirugiaId,
    accion: 'fecha_reprogramada',
    estado_nuevo: estado_actual,
    observaciones: `Fecha reprogramada a ${nuevaFecha}`,
    metadata: { 
      fecha_anterior: fechaAnterior,
      fecha_nueva: nuevaFecha 
    }
  }).subscribe();
}

// Cuando se inicia la cirugía
iniciarCirugia(cirugiaId: string) {
  this.updateEstado(cirugiaId, 'en_proceso', 'Cirugía iniciada').pipe(
    switchMap(() => 
      this.trazabilidadService.registrarEventoCirugia({
        cirugia_id: cirugiaId,
        accion: 'cirugia_iniciada',
        estado_anterior: 'programada',
        estado_nuevo: 'en_proceso',
        observaciones: 'Cirugía iniciada en quirófano'
      })
    )
  ).subscribe();
}

// Cuando se finaliza la cirugía
finalizarCirugia(cirugiaId: string, duracion: number) {
  this.updateEstado(cirugiaId, 'finalizada', 'Cirugía finalizada exitosamente').pipe(
    switchMap(() => 
      this.trazabilidadService.registrarEventoCirugia({
        cirugia_id: cirugiaId,
        accion: 'cirugia_finalizada',
        estado_anterior: 'en_proceso',
        estado_nuevo: 'finalizada',
        observaciones: `Cirugía finalizada. Duración: ${duracion} minutos`,
        metadata: { duracion_minutos: duracion }
      })
    )
  ).subscribe();
}
```

### 2. Ejecutar SQL Scripts

**CRÍTICO - Ejecutar en Supabase:**

```sql
-- 1. Actualizar constraint de kits
-- update_estados_kit_constraint.sql

-- 2. Actualizar kits existentes
-- actualizar_kits_existentes.sql

-- 3. Crear tabla de trazabilidad (si no existe)
-- crear_tabla_cirugia_trazabilidad.sql
```

### 3. Probar el Flujo Completo

1. Crear una cirugía nueva desde el formulario
2. Ir a `/internal/trazabilidad`
3. Buscar la cirugía recién creada
4. Verificar que aparece el evento "➕ Cirugía Creada"
5. Cambiar el estado de la cirugía
6. Verificar que aparece el evento "🔄 Estado Cambiado"

## 📝 Notas Importantes

- ✅ La trazabilidad **NO bloquea** las operaciones principales
- ✅ Si falla el registro de trazabilidad, se loguea pero continúa
- ✅ El `usuario_id` se captura automáticamente del usuario autenticado
- ✅ Los timestamps son automáticos (NOW() en PostgreSQL)
- ✅ La metadata es flexible (JSONB) para agregar información adicional

## 🎯 Resultado Final

Ahora cada vez que se:
- ✅ **Crea una cirugía** → Se registra en trazabilidad con estado "programada"
- ✅ **Cambia el estado** → Se registra el cambio con estado anterior y nuevo
- ✅ **Asigna técnico** (futuro) → Se puede registrar fácilmente
- ✅ **Reprograma fecha** (futuro) → Se puede registrar fácilmente

Todo visible en el módulo de trazabilidad con:
- Iconos emoji
- Timeline vertical
- Usuario que realizó la acción
- Timestamps relativos
- Metadata expandible

---

**Actualizado:** 2025-01-29  
**Integración:** Completa ✅  
**Estado:** Listo para probar (después de ejecutar SQL scripts)
