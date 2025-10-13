# 🔧 Scripts de Migración para Cotizaciones

## ⚡ SOLUCIÓN RÁPIDA (Empieza aquí)

**¿Tu problema?** Las cotizaciones se guardan con IVA cuando NO deberían.

**Solución en 2 pasos:**
1. Ejecuta: `006_fix_iva_en_calculate_totals.sql` ⭐
2. Verifica: `007_verificar_correccion_iva.sql` ✅

📖 **Guía completa**: Ver `SOLUCION_RAPIDA_IVA.md`

---

## 🔍 Scripts de Diagnóstico (Ejecutar primero)

Antes de aplicar las migraciones, puedes ejecutar estos scripts para ver el estado actual:

### 📊 Script 000a: Listar todos los triggers y funciones (completo)
**Archivo**: `000_list_all_triggers_and_functions.sql`
**Qué hace**:
- Lista todas las funciones definidas
- Lista todos los triggers activos
- Muestra el código fuente completo de cada función
- Genera un resumen ejecutivo
- Filtra específicamente triggers de cotizaciones

**Cuándo usar**: Para diagnóstico completo y detallado

### 📋 Script 000b: Listar triggers (versión simple)
**Archivo**: `000_list_triggers_simple.sql`
**Qué hace**:
- Consultas SQL simples y rápidas
- Lista funciones, triggers y su código
- Más fácil de leer y ejecutar

**Cuándo usar**: Para verificación rápida

---

## �📋 Orden de Ejecución - Migraciones

Ejecuta estos scripts **en orden** en el SQL Editor de Supabase:

### 1️⃣ Script 003: Corregir políticas RLS
**Archivo**: `003_fix_cotizaciones_rls_policies.sql`
**Problema que resuelve**: 
- ❌ Error 403 Forbidden al insertar en `cotizacion_historial`
- ❌ Error 403 Forbidden al actualizar `cotizaciones` desde triggers

**Qué hace**:
- Permite que los triggers automáticos funcionen
- Mantiene la seguridad para usuarios normales

---

### 2️⃣ Script 004: Agregar tipos de notificación
**Archivo**: `004_add_cotizacion_notification_types.sql`
**Problema que resuelve**:
- ❌ Error 400: "invalid input value for enum notification_type: 'cambio_estado_cotizacion'"

**Qué hace**:
- Agrega los valores al enum: `cotizacion_aprobada`, `cotizacion_rechazada`, `cotizacion_proxima_vencer`, `cotizacion_vencida`

---

### 3️⃣ Script 006: Corregir función de cálculo (ELIMINAR IVA) ⭐⭐ EJECUTAR ESTE
**Archivo**: `006_fix_iva_en_calculate_totals.sql`
**Problema que resuelve**:
- ❌ Las cotizaciones se guardan con IVA incluido (NO DEBE TENER IVA)
- ❌ La función `calculate_cotizacion_totals` incluye IVA en el cálculo

**Qué hace**:
- Reemplaza la función existente `calculate_cotizacion_totals()` SIN IVA
- Crea trigger adicional `trigger_recalculate_on_costs_change` para recalcular al cambiar costos
- Actualiza todas las cotizaciones existentes: `iva = 0`
- Fórmula final: `Total = Subtotal + Transporte - Descuento`
- Muestra tabla de verificación al final

**Por qué este y no el 005**: Este script trabaja con los triggers EXISTENTES en tu base de datos

---

## ⚡ Ejecución Rápida

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y pega cada script **en orden** (003 → 004 → 005)
3. Presiona **Run** o `Ctrl+Enter` después de cada uno
4. Verifica el mensaje de éxito: `✅ ...`

---

## 🎯 Resultado Esperado

Después de ejecutar los 3 scripts:

✅ Las cotizaciones se crean correctamente  
✅ El historial de cambios se registra automáticamente  
✅ Los totales se calculan automáticamente  
✅ Las notificaciones se envían sin errores  
✅ **NO SE INCLUYE IVA** en ningún cálculo  
✅ Fórmula correcta: `Total = Subtotal + Transporte - Descuento`

---

## 🔍 Verificación

Después de ejecutar los scripts:

```sql
-- Verificar que IVA = 0 en todas las cotizaciones
SELECT numero_cotizacion, subtotal, iva, total 
FROM cotizaciones 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar tipos de notificación
SELECT unnest(enum_range(NULL::notification_type))::text 
WHERE unnest(enum_range(NULL::notification_type))::text LIKE 'cotizacion%';
```

---

## 📝 Notas Importantes

- **NO** ejecutes estos scripts más de una vez (tienen protección `IF EXISTS`)
- Los scripts son **idempotentes** (puedes ejecutarlos de nuevo sin romper nada)
- Si ya ejecutaste el script 003 anteriormente, puedes saltarlo
- El script 005 es el **MÁS IMPORTANTE** para eliminar el IVA

---

**Última actualización**: 2025-10-13
