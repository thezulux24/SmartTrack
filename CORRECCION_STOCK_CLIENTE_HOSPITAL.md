# CORRECCIÓN: Stock, Hospital y Cliente en Kits Pendientes

## 🔍 Problemas Corregidos

### 1. **Stock de productos no se mostraba** ❌→✅
**Problema**: La tabla `productos` NO tiene un campo `stock_total`. El stock real está en la tabla `inventario`.

**Solución**:
- Query actualizada para incluir relación con `inventario`
- Creadas funciones `calcularStockTotal()` y `tieneStockSuficiente()`
- El stock ahora se calcula sumando las cantidades del inventario con estado `'disponible'`

### 2. **Hospital/Clínica no se mostraba** ❌→✅
**Problema**: La query no incluía la relación `hospital` dentro de `cirugias`.

**Solución**:
- Query actualizada con `hospital:hospitales(*)` dentro de `cirugias`
- Creada función `obtenerNombreHospital()`

### 3. **Decía "Paciente" en lugar de "Cliente"** ❌→✅
**Problema**: Label incorrecto en el HTML.

**Solución**:
- Cambiado "Paciente" por "Cliente"
- Renombrado método `obtenerNombrePaciente()` a `obtenerNombreCliente()`

---

## 📝 Cambios Implementados

### **kit.service.ts**

#### Query mejorada para `getKitsPorEstado()`:
```typescript
.select(`
  *,
  cirugia:cirugias(
    *,
    cliente:clientes(*),      // ✅ AGREGADO
    hospital:hospitales(*)    // ✅ AGREGADO
  ),
  comercial:profiles!comercial_id(*),
  tecnico:profiles!tecnico_id(*),
  logistica:profiles!logistica_id(*),
  productos:kit_productos(
    *,
    producto:productos(
      *,
      inventario:inventario(cantidad, ubicacion, estado)  // ✅ AGREGADO
    )
  )
`)
```

### **kits-pendientes-list.component.ts**

#### Funciones agregadas:

```typescript
// ✅ Calcular stock total desde inventario
calcularStockTotal(producto: any): number {
  if (!producto?.producto?.inventario) return 0;
  
  return producto.producto.inventario
    .filter((inv: any) => inv.estado === 'disponible')
    .reduce((total: number, inv: any) => total + (inv.cantidad || 0), 0);
}

// ✅ Verificar si hay stock suficiente
tieneStockSuficiente(producto: any): boolean {
  const stockTotal = this.calcularStockTotal(producto);
  return stockTotal >= producto.cantidad_solicitada;
}

// ✅ Obtener nombre del cliente
obtenerNombreCliente(kit: KitCirugia): string {
  const cliente = kit.cirugia?.cliente;
  if (cliente) {
    return `${cliente.nombre} ${cliente.apellido}`;
  }
  return 'N/A';
}

// ✅ Obtener nombre del hospital
obtenerNombreHospital(kit: KitCirugia): string {
  return kit.cirugia?.hospital?.nombre || 'N/A';
}
```

### **kits-pendientes-list.component.html**

#### Cambios en la tabla:

```html
<!-- ✅ Stock calculado dinámicamente -->
<td class="px-3 md:px-4 py-3 text-sm text-gray-900 dark:text-gray-300">
  {{ calcularStockTotal(producto) }}
</td>

<!-- ✅ Estado basado en stock real -->
<td class="px-3 md:px-4 py-3 text-sm">
  @if (tieneStockSuficiente(producto)) {
    <span class="...green...">OK</span>
  } @else {
    <span class="...red...">Sin Stock</span>
  }
</td>

<!-- ✅ Cliente en lugar de Paciente -->
<span><strong>Cliente:</strong> {{ obtenerNombreCliente(kit) }}</span>

<!-- ✅ Hospital se muestra correctamente -->
<span><strong>Hospital:</strong> {{ kit.cirugia?.hospital?.nombre || 'N/A' }}</span>
```

---

## 🧪 Verificación

### 1. **Stock de Productos**

El stock ahora se calcula desde la tabla `inventario`:

```sql
-- Verificar stock de un producto
SELECT 
  p.nombre as producto,
  i.ubicacion,
  i.cantidad,
  i.estado
FROM productos p
LEFT JOIN inventario i ON p.id = i.producto_id
WHERE p.id = '<producto_id>';
```

**Ejemplo**:
- Producto: "Tornillo Titanio 4mm"
- Inventario:
  - Sede Norte: 50 unidades (disponible) ✅
  - Sede Sur: 30 unidades (disponible) ✅
  - Sede Norte: 10 unidades (reservado) ❌
- **Stock Total Mostrado**: 80 unidades (solo suma los disponibles)

### 2. **Cliente y Hospital**

```sql
-- Verificar relaciones completas
SELECT 
  k.numero_kit,
  c.numero_cirugia,
  cl.nombre || ' ' || cl.apellido as cliente,
  h.nombre as hospital
FROM kits_cirugia k
JOIN cirugias c ON k.cirugia_id = c.id
JOIN clientes cl ON c.cliente_id = cl.id
JOIN hospitales h ON c.hospital_id = h.id
WHERE k.estado = 'solicitado';
```

---

## 📊 Formato de Datos Esperado

### Vista de Kits Pendientes:

```
┌─────────────────────────────────────────────────────────┐
│ KIT-2025-123456                         [PENDIENTE]     │
├─────────────────────────────────────────────────────────┤
│ 📋 Cirugía: CIR-2025-001                               │
│ 👤 Cliente: Juan Pérez García                          │
│ 📅 Fecha: 15/10/2025 08:30                            │
│ 🏥 Hospital: Clínica San José                          │
│                                                         │
│ 📦 Productos Solicitados (3)                           │
│ ┌──────────────────┬──────┬───────┬────────┐          │
│ │ Producto         │ Cant.│ Stock │ Estado │          │
│ ├──────────────────┼──────┼───────┼────────┤          │
│ │ Tornillo 4mm     │  10  │   80  │   OK   │ ✅       │
│ │ Placa Recta      │   2  │    5  │   OK   │ ✅       │
│ │ Implante Dental  │   3  │    1  │Sin Stock│ ❌       │
│ └──────────────────┴──────┴───────┴────────┘          │
│                                                         │
│           [Rechazar]  [Aprobar y Preparar]            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Si el stock sigue mostrando 0:

1. **Verifica que existen registros en `inventario`**:
```sql
SELECT COUNT(*) FROM inventario;
```

2. **Verifica productos con inventario**:
```sql
SELECT 
  p.nombre,
  COUNT(i.id) as registros_inventario,
  SUM(CASE WHEN i.estado = 'disponible' THEN i.cantidad ELSE 0 END) as stock_disponible
FROM productos p
LEFT JOIN inventario i ON p.id = i.producto_id
GROUP BY p.id, p.nombre
ORDER BY p.nombre;
```

3. **Abre Console del navegador** (F12) y busca:
```
Kits recibidos: X [Array]
```
Expande el array y verifica que `productos[0].producto.inventario` tenga datos.

### Si el cliente/hospital no aparece:

1. **Verifica que la cirugía tiene cliente y hospital**:
```sql
SELECT 
  c.numero_cirugia,
  c.cliente_id,
  c.hospital_id,
  cl.nombre as cliente_nombre,
  h.nombre as hospital_nombre
FROM cirugias c
LEFT JOIN clientes cl ON c.cliente_id = cl.id
LEFT JOIN hospitales h ON c.hospital_id = h.id
WHERE c.id = '<cirugia_id>';
```

2. **Verifica permisos RLS** en Supabase:
   - Tabla `clientes`: SELECT habilitado
   - Tabla `hospitales`: SELECT habilitado
   - Tabla `inventario`: SELECT habilitado

---

## ✅ Resultado Esperado

Ahora en "Kits Pendientes" deberías ver:

✅ **Stock correcto** calculado desde inventario  
✅ **"Cliente"** en lugar de "Paciente"  
✅ **Hospital/Clínica** mostrada correctamente  
✅ **Badge verde** si hay stock suficiente  
✅ **Badge rojo** si falta stock  

---

## 🚀 Próximos Pasos

1. ✅ Verificar que se muestren todos los datos correctamente
2. 🔄 Ejecutar scripts SQL en Supabase (si aún no lo hiciste)
3. 🔄 Implementar pantalla de preparación completa
4. 🔄 Validación física de inventario con descuento de stock
