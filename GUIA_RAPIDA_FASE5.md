# 🚀 Guía Rápida de Uso - FASE 5

## ⚡ Inicio Rápido

### 1. Preparación (Una sola vez)
```sql
-- En Supabase SQL Editor, ejecutar:
-- Ubicación: fase5_devolucion_limpieza_schema.sql
```

### 2. Acceder a los Módulos

#### 👨‍🔧 Como Técnico
1. Ir al dashboard técnico: `/internal/tecnico`
2. Sección **"Kits Devueltos"** (naranja)
3. Clic en **"Procesar Devolución"**

#### 🧼 Como Personal de Limpieza
1. Ir a: `/internal/limpieza`
2. Ver kits en proceso de limpieza
3. Clic en kit para ver detalles
4. Marcar productos: Pendiente → En Proceso → Esterilizado

#### ✅ Como Supervisor
1. Ir a: `/internal/limpieza/aprobacion`
2. Ver kits con productos esterilizados
3. Ajustar cantidades si necesario
4. Clic **"Aprobar y Finalizar Kit"**

---

## 🎮 Flujo de Usuario - Paso a Paso

### Escenario: Kit devuelto después de cirugía

#### PASO 1: Técnico Procesa Devolución

**Navegación:**
```
/internal/tecnico → Sección "Kits Devueltos" → "Procesar Devolución"
```

**Acciones:**
1. Ver lista de productos con cantidades
2. Para cada producto decidir:
   - **Reutilizable** ♻️ → Ajustar cantidad a recuperar
   - **Desechable** 🗑️ → Toggle al rojo
3. Agregar notas si necesario
4. Clic **"Confirmar y Enviar a Limpieza"**

**Resultado:**
- Kit pasa a estado `en_limpieza`
- Productos reutilizables aparecen en módulo de limpieza

---

#### PASO 2: Personal de Limpieza Procesa

**Navegación:**
```
/internal/limpieza
```

**Acciones:**
1. Ver lista de kits en limpieza
2. Clic en un kit para abrir modal
3. Para cada producto:
   - Clic **"Iniciar Proceso"** (amarillo → azul)
   - Agregar observaciones de limpieza
   - Clic **"Guardar"** (observaciones)
   - Clic **"Marcar como Esterilizado"** (azul → verde)
4. Cerrar modal cuando todos estén esterilizados

**Resultado:**
- Productos pasan a `esterilizado`
- Kit aparece en módulo de aprobación

---

#### PASO 3: Supervisor Aprueba

**Navegación:**
```
/internal/limpieza/aprobacion
```

**Acciones:**
1. Ver kits listos para aprobación
2. Clic en kit para revisar
3. Revisar cada producto:
   - Ver cantidad a recuperar
   - Ajustar con +/- si detecta daños
   - Revisar observaciones
4. Clic **"Aprobar y Finalizar Kit"**
5. Confirmar en el diálogo

**Resultado:**
- Inventario actualizado con productos recuperados
- Kit marcado como `finalizado` ✅
- Ciclo de vida completo

---

## 💡 Tips y Trucos

### Ajustar Cantidades
```
Botón [-]  : Reduce en 1
Botón [+]  : Aumenta en 1
Mínimo     : 0
Máximo     : cantidad_disponible/cantidad_a_recuperar
```

### Estados Visuales
```
🟡 Amarillo  : Pendiente
🔵 Azul      : En Proceso
🟢 Verde     : Esterilizado / Aprobado
🔴 Rojo      : Desechable
🟠 Naranja   : Kit Devuelto
🟣 Morado    : Kit en Limpieza
```

### Filtros Automáticos
- Limpieza: Solo ve productos **reutilizables**
- Aprobación: Solo ve productos **esterilizados**
- Desechables: No aparecen en limpieza/aprobación

---

## ⚠️ Casos Especiales

### Kit 100% Desechable
Si todos los productos fueron marcados como desechables:
- No aparecerá en limpieza (no hay nada que procesar)
- No aparecerá en aprobación
- **Solución temporal:** Cambiar estado manualmente a `finalizado`
- **Mejora futura:** Botón "Finalizar Sin Recuperación"

### Producto Dañado en Supervisión
Si el supervisor detecta daño en un producto esterilizado:
1. Usar botones [-] para reducir `cantidad_aprobada` a 0
2. Solo los productos con cantidad > 0 regresan al inventario
3. Kit se finaliza de todas formas

### Productos Parcialmente Usados
Si un producto tiene cantidad_utilizada menor que cantidad_enviada:
- `cantidad_disponible` = enviada - utilizada
- Por defecto, todo lo disponible se recupera
- Técnico puede ajustar si parte está dañada

---

## 🔍 Verificaciones

### Después de Procesar Devolución
```sql
-- Verificar estado del kit
SELECT estado FROM kits_cirugia WHERE numero_kit = 'KIT-XXX';
-- Debe ser: en_limpieza

-- Verificar registros de limpieza
SELECT COUNT(*) FROM kit_productos_limpieza WHERE kit_id = 'uuid';
-- Debe ser > 0 si hay reutilizables
```

### Después de Aprobar
```sql
-- Verificar inventario actualizado
SELECT cantidad FROM inventario WHERE producto_id = 'uuid';
-- Debe haber aumentado

-- Verificar kit finalizado
SELECT estado FROM kits_cirugia WHERE id = 'uuid';
-- Debe ser: finalizado

-- Verificar movimiento registrado
SELECT * FROM movimientos_inventario 
WHERE motivo LIKE '%Recuperación de kit%' 
ORDER BY fecha DESC LIMIT 1;
```

---

## 🎯 KPIs Visuales

### Dashboard Técnico
```
[Cirugías en Curso] [Pendientes Validación] [Kits Validados]
        3                    5                   2

[Kits Devueltos]  ← Nueva sección naranja
      4
```

### Dashboard Limpieza
```
[Total Kits] [Pendientes] [En Proceso] [Esterilizados]
     4            12           8            15
```

### Dashboard Aprobación
```
[Kits Listos] [Productos Esterilizados]
     2                 15
```

---

## 🚨 Troubleshooting Rápido

### "No veo el botón Procesar Devolución"
- Verificar que hay kits en estado `devuelto`
- Refrescar la página
- Verificar que el kit tiene `fecha_devolucion`

### "Kit no aparece en Limpieza"
- Verificar estado del kit: debe ser `en_limpieza`
- Verificar que hay productos con `es_desechable = false`
- Revisar tabla `kit_productos_limpieza`

### "No puedo aprobar el kit"
- Verificar que todos los productos están en estado `esterilizado`
- Revisar permisos de usuario
- Verificar que `cantidad_aprobada` no sea mayor que `cantidad_a_recuperar`

### "Inventario no se actualizó"
- Revisar logs de consola del navegador
- Verificar permisos en tabla `inventario`
- Verificar que `producto_id` existe

---

## 📱 Accesos Directos

```
Técnico - Procesar:
/internal/tecnico/procesar-devolucion/:kitId

Limpieza - Dashboard:
/internal/limpieza

Supervisor - Aprobación:
/internal/limpieza/aprobacion

Volver al Dashboard Principal:
/internal
```

---

## 🎓 Capacitación de Usuarios

### Para Técnicos (5 min)
1. "Después de una cirugía, el kit aparece aquí" → Mostrar sección naranja
2. "Haz clic en Procesar Devolución"
3. "Decide qué se puede reutilizar y qué no"
4. "Confirma y el sistema lo envía a limpieza"

### Para Limpieza (5 min)
1. "Aquí ves todos los kits que necesitan limpieza"
2. "Haz clic para ver detalles"
3. "Marca cuando empiezas el proceso"
4. "Cuando esté esterilizado, márcalo"

### Para Supervisores (5 min)
1. "Aquí ves kits listos para aprobar"
2. "Revisa las observaciones de limpieza"
3. "Ajusta cantidades si ves daños"
4. "Aprueba y automáticamente regresa al inventario"

---

## ✅ Checklist de Primera Vez

- [ ] Ejecuté el migration SQL
- [ ] Probé crear un kit completo
- [ ] Finalicé una cirugía
- [ ] Procesé la devolución como técnico
- [ ] Marqué productos como esterilizados
- [ ] Aprobé el kit como supervisor
- [ ] Verifiqué que el inventario se actualizó
- [ ] Confirmé que el kit está en estado `finalizado`

---

## 🎉 ¡Listo para Usar!

**El sistema está completo y funcional. Cualquier duda:**
- Ver documentación completa: `FASE5_DEVOLUCION_LIMPIEZA.md`
- Revisar resumen: `RESUMEN_FASE5.md`
- Consultar código fuente en: `src/app/features/internal/limpieza/`

---

**Última actualización:** 2025-01-08  
**Versión:** 1.0  
**Estado:** ✅ Listo para Uso
