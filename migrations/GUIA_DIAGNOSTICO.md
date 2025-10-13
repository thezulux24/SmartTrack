# 📖 Guía de Uso de Scripts de Diagnóstico

## 🎯 Propósito

Estos scripts te permiten inspeccionar tu base de datos de Supabase para ver **exactamente** qué triggers y funciones están activos, especialmente para las cotizaciones.

---

## 📊 Script 1: Diagnóstico Completo
**Archivo**: `000_list_all_triggers_and_functions.sql`

### ¿Qué Muestra?

1. **📋 Lista de Funciones**: Todas las funciones definidas con sus argumentos
2. **⚡ Lista de Triggers**: Todos los triggers activos con las tablas asociadas
3. **📜 Código Fuente**: El código SQL completo de cada función
4. **📊 Resumen**: Contadores totales
5. **💰 Filtro de Cotizaciones**: Solo triggers relacionados con cotizaciones

### Cómo Usarlo

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Pega el contenido completo del archivo
3. Presiona **Run** o `Ctrl+Enter`
4. Lee los resultados en el panel de mensajes

### Ejemplo de Salida

```
═══════════════════════════════════════════════════════════════════
📋 FUNCIONES DEFINIDAS EN EL SCHEMA PUBLIC
═══════════════════════════════════════════════════════════════════

Nombre de la Función          | Argumentos | Tipo de Retorno
------------------------------|------------|----------------
calculate_cotizacion_totals   |            | trigger
generate_numero_cotizacion    |            | trigger
log_cotizacion_estado_change  |            | trigger

═══════════════════════════════════════════════════════════════════
⚡ TRIGGERS DEFINIDOS EN EL SCHEMA PUBLIC
═══════════════════════════════════════════════════════════════════

Nombre del Trigger              | Tabla              | Timing | Evento
--------------------------------|--------------------|--------|--------
trg_calculate_cotizacion_totals | cotizacion_items   | AFTER  | INSERT
trg_generate_numero_cotizacion  | cotizaciones       | BEFORE | INSERT
```

---

## 📋 Script 2: Diagnóstico Simple
**Archivo**: `000_list_triggers_simple.sql`

### ¿Qué Muestra?

4 consultas SQL independientes que puedes ejecutar por separado:

1. **Query 1**: Lista todas las funciones
2. **Query 2**: Lista todos los triggers
3. **Query 3**: Solo triggers de cotizaciones
4. **Query 4**: Código fuente de funciones de cotizaciones

### Cómo Usarlo

**Opción A: Ejecutar todo junto**
- Pega todo el archivo y ejecuta
- Verás 4 tablas de resultados

**Opción B: Ejecutar consultas individuales**
- Selecciona solo la consulta que te interesa
- Ejecuta solo esa parte
- Más rápido para verificaciones puntuales

### Ventajas
- ✅ Más rápido de ejecutar
- ✅ Resultados en formato de tabla (fácil de leer)
- ✅ Puedes copiar/pegar consultas individuales
- ✅ No requiere esperar a que termine todo

---

## 🔍 Casos de Uso

### Caso 1: "¿Qué triggers tengo en cotizaciones?"
**Script recomendado**: `000_list_triggers_simple.sql` - Query 3
```sql
-- Ejecuta solo esta parte:
SELECT 
  '💰 ' || t.tgname AS "Trigger",
  t.tgrelid::regclass AS "Tabla",
  ...
WHERE ... c.relname LIKE '%cotizacion%'
```

### Caso 2: "¿Cómo está definida la función X?"
**Script recomendado**: `000_list_triggers_simple.sql` - Query 4
```sql
-- Ver código fuente de funciones de cotizaciones
SELECT 
  '📜 FUNCIÓN: ' || p.proname AS "Definición",
  pg_get_functiondef(p.oid) AS "Código Fuente"
...
```

### Caso 3: "Dame un reporte completo"
**Script recomendado**: `000_list_all_triggers_and_functions.sql`
- Ejecuta todo el archivo
- Lee los mensajes en el panel de NOTICES
- Guarda el output para referencia

### Caso 4: "¿Existe el trigger de totales?"
**Script recomendado**: Ejecuta esto directamente en SQL Editor:
```sql
SELECT EXISTS (
  SELECT 1 
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'cotizacion_items'
    AND t.tgname = 'trg_calculate_cotizacion_totals'
) AS "¿Existe Trigger?";
```

---

## 🚨 Qué Buscar en los Resultados

### ✅ Lo que DEBERÍA estar presente (después de migraciones)

**Funciones esperadas:**
- `calculate_cotizacion_totals()` - Calcula subtotal y total
- `generate_numero_cotizacion()` - Genera COT-YYYY-NNNNNN
- `log_cotizacion_estado_change()` - Registra cambios de estado
- `recalculate_on_costs_change()` - Recalcula cuando cambian costos

**Triggers esperados:**
- `trg_calculate_cotizacion_totals` en `cotizacion_items`
- `trg_generate_numero_cotizacion` en `cotizaciones`
- `trg_log_estado_change` en `cotizaciones`
- `trg_recalculate_on_costs_change` en `cotizaciones`

### ❌ Problemas comunes a detectar

**Problema 1: Función con IVA**
Si ves esto en el código fuente:
```sql
iva = v_subtotal * 0.19  -- ❌ MAL
iva = v_subtotal * 0.12  -- ❌ MAL
```
**Solución**: Ejecutar `005_remove_iva_from_cotizaciones.sql`

**Problema 2: Trigger deshabilitado**
Si en la columna "Habilitado" ves: `D` (disabled)
**Solución**: 
```sql
ALTER TABLE tabla_name ENABLE TRIGGER nombre_trigger;
```

**Problema 3: Función no existe**
Si no aparece en los resultados
**Solución**: Ejecutar el script de migración correspondiente

---

## 📝 Tips de Interpretación

### Timing del Trigger
- **BEFORE**: Se ejecuta ANTES de la operación (puede modificar datos)
- **AFTER**: Se ejecuta DESPUÉS de la operación (para logging, cálculos)

### Nivel del Trigger
- **ROW**: Se ejecuta por cada fila afectada
- **STATEMENT**: Se ejecuta una vez por sentencia SQL

### Evento del Trigger
- **INSERT**: Al crear nuevos registros
- **UPDATE**: Al modificar registros
- **DELETE**: Al eliminar registros

### Volatilidad de Función
- **IMMUTABLE**: Siempre retorna el mismo resultado (optimizable)
- **STABLE**: Resultado consistente dentro de una transacción
- **VOLATILE**: Puede cambiar en cada llamada (NOW(), RANDOM())

---

## 🎓 Ejemplo Práctico

### Escenario: "Verificar si el trigger de totales está calculando sin IVA"

**Paso 1**: Lista las funciones de cotizaciones
```sql
-- Ejecuta Query 4 de 000_list_triggers_simple.sql
```

**Paso 2**: Busca en el resultado la función `calculate_cotizacion_totals`

**Paso 3**: Revisa el código fuente en la columna "Código Fuente"

**Paso 4**: Busca la línea que calcula el total:
```sql
-- ✅ CORRECTO (sin IVA)
total = v_subtotal + v_costo_transporte - v_descuento

-- ❌ INCORRECTO (con IVA)
total = v_subtotal + v_iva + v_costo_transporte - v_descuento
```

**Paso 5**: Si está incorrecto, ejecuta `005_remove_iva_from_cotizaciones.sql`

---

## 🆘 Solución de Problemas

### No veo ningún trigger de cotizaciones
**Causa**: Aún no has ejecutado las migraciones
**Solución**: Ejecuta los scripts 003, 004, 005 en orden

### Veo triggers duplicados
**Causa**: Ejecutaste migraciones múltiples veces sin DROP
**Solución**: Los scripts tienen `DROP IF EXISTS`, vuelve a ejecutarlos

### El código fuente muestra "NULL"
**Causa**: Problema de permisos o función del sistema
**Solución**: Verifica que estés consultando el schema 'public'

---

**Última actualización**: 2025-10-13
