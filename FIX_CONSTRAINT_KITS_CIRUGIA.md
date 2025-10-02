# Fix para Error: kits_cirugia_estado_check Constraint Violation

## 🔴 Problema
```
ERROR: 23514: check constraint "kits_cirugia_estado_check" 
of relation "kits_cirugia" is violated by some row
```

## 🔍 Causa Raíz
1. **Constraint Existe en Supabase pero NO en schema local**: El archivo `database.sql` no tenía definida la restricción CHECK para el campo `estado`
2. **Valores Inválidos**: Alguna fila en `kits_cirugia` tiene un valor de `estado` que no está en la lista permitida por el constraint
3. **Aplicación Accidental**: Mencionaste aplicar algo dos veces - probablemente aplicaste un ALTER TABLE que agregó el constraint y ahora los datos existentes lo violan

## ✅ Solución

### Paso 1: Ejecutar el Script de Corrección
Ejecuta el archivo `fix_kits_cirugia_estado_constraint.sql` en Supabase SQL Editor paso por paso:

```sql
-- 1. Ver qué valores de estado existen actualmente
SELECT DISTINCT estado, COUNT(*) as cantidad
FROM public.kits_cirugia
GROUP BY estado
ORDER BY estado;
```

**Analiza el resultado**: ¿Hay valores como `'en_preparacion'`, `'pendiente'`, `'enviado'`, o NULL?

```sql
-- 2. Eliminar el constraint problemático
ALTER TABLE public.kits_cirugia
DROP CONSTRAINT IF EXISTS kits_cirugia_estado_check;
```

```sql
-- 3. Ver filas con valores inválidos
SELECT id, numero_kit, estado
FROM public.kits_cirugia
WHERE estado IS NULL OR estado NOT IN (
  'solicitado', 'preparando', 'listo_envio', 'en_transito',
  'entregado', 'en_uso', 'devuelto', 'finalizado', 'cancelado'
);
```

```sql
-- 4. Corregir valores inválidos (ajusta según lo que encontraste)
-- Ejemplo: convertir NULL a 'preparando'
UPDATE public.kits_cirugia
SET estado = 'preparando'
WHERE estado IS NULL;

-- Ejemplo: convertir 'en_preparacion' a 'preparando'
UPDATE public.kits_cirugia
SET estado = 'preparando'
WHERE estado = 'en_preparacion';

-- Ejemplo: convertir 'enviado' a 'en_transito'
UPDATE public.kits_cirugia
SET estado = 'en_transito'
WHERE estado = 'enviado';
```

```sql
-- 5. Recrear el constraint con los valores correctos
ALTER TABLE public.kits_cirugia
ADD CONSTRAINT kits_cirugia_estado_check 
CHECK (estado IN (
  'solicitado',      -- FASE 1: Kit solicitado por comercial
  'preparando',      -- FASE 2: Logística preparando el kit
  'listo_envio',     -- FASE 2: Kit listo para enviar
  'en_transito',     -- FASE 3: Kit en camino al cliente/hospital
  'entregado',       -- FASE 3: Kit entregado y validado por cliente
  'en_uso',          -- FASE 4: Kit en uso durante cirugía
  'devuelto',        -- FASE 5-6: Kit devuelto a logística
  'finalizado',      -- FASE 7: Proceso completo, listo para facturación
  'cancelado'        -- Cualquier fase: Kit/cirugía cancelada
));
```

```sql
-- 6. Verificar que el constraint se creó correctamente
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.kits_cirugia'::regclass
  AND conname = 'kits_cirugia_estado_check';
```

### Paso 2: Archivo database.sql Actualizado
Ya actualicé el archivo `database.sql` para incluir:
- ✅ Los 4 nuevos campos para validación de cliente
- ✅ El constraint CHECK con los 9 estados permitidos

## 📋 Estados Permitidos del Kit (Flujo de 7 Fases)

| Estado | Fase | Descripción |
|--------|------|-------------|
| `solicitado` | FASE 1 | Comercial creó la cirugía y solicitó el kit |
| `preparando` | FASE 2 | Logística está preparando los productos del kit |
| `listo_envio` | FASE 2 | Kit completo, listo para enviar al cliente |
| `en_transito` | FASE 3 | Kit en camino hacia el hospital/cliente |
| `entregado` | FASE 3 | Cliente validó recepción del kit con QR |
| `en_uso` | FASE 4 | Técnico está usando el kit en la cirugía |
| `devuelto` | FASE 5-6 | Kit devuelto a logística post-cirugía |
| `finalizado` | FASE 7 | Proceso completo, kit inventariado, listo para facturar |
| `cancelado` | Cualquiera | Cirugía/kit cancelado |

## 🔧 Campos Nuevos Agregados a kits_cirugia

```typescript
cliente_receptor_nombre: string | null   // Nombre del empleado del hospital
cliente_receptor_cedula: string | null   // Cédula del receptor
cliente_validacion_fecha: timestamp | null  // Cuándo se validó la entrega
cliente_validacion_qr: string | null     // QR code usado para validar
```

## 🚀 Próximos Pasos

Después de corregir este error:

1. **Actualizar componente kit-builder** para usar los nuevos estados
2. **Implementar QR de validación de entrega** (FASE 3)
3. **Actualizar transiciones de estado** en el flujo del negocio

## ⚠️ Prevención Futura

Para evitar este error en el futuro:
- Siempre mantén `database.sql` sincronizado con Supabase
- Usa migraciones versionadas para cambios de schema
- Valida datos antes de agregar constraints
- Documenta todos los cambios de schema
