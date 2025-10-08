# 🚚 Sistema de Mensajeros - Guía Simple

## ¿Qué hace?

Permite asignar un mensajero a los kits que están listos para enviar, y automáticamente cambia el estado del kit a "en_transito".

## 📦 Pasos para configurar

### 1. Ejecutar SQL en Supabase

1. Ir a Supabase → SQL Editor
2. Copiar y pegar el contenido de `database_simple.sql`
3. Hacer clic en **Run**

Esto creará:
- Tabla `mensajeros` (nombre, teléfono, placa, estado)
- Tabla `envios` (kit, mensajero, dirección, fechas, estado)
- 3 mensajeros de prueba

### 2. Usar el sistema

1. **Preparar un kit** (debe quedar en estado `listo_envio`)
2. Ir a **Logística → Kits Listos para Envío**
3. Hacer clic en **"Asignar Mensajero"**
4. Seleccionar un mensajero de la lista
5. El sistema **pre-llena automáticamente**:
   - **Dirección**: Desde el hospital asociado a la cirugía
   - **Contacto**: Nombre completo del paciente (cliente)
   - **Teléfono**: Del hospital o del paciente
6. **Puedes editar** cualquiera de estos campos si es necesario
7. Completar fecha programada (obligatorio)
8. Hacer clic en **"Asignar y Despachar"**

¡Listo! El kit ahora está en estado `en_transito` y el mensajero aparece como `ocupado`.

## 🔄 ¿Cómo funciona automáticamente?

- Cuando asignas un mensajero → Kit pasa a `en_transito` y mensajero a `ocupado`
- Cuando el cliente escanea el QR y confirma → Envío pasa a `entregado` y mensajero vuelve a `disponible`

## 📊 Consultas útiles

```sql
-- Ver envíos activos
SELECT * FROM envios WHERE estado IN ('programado', 'en_transito');

-- Ver mensajeros disponibles
SELECT * FROM mensajeros WHERE estado = 'disponible';

-- Agregar nuevo mensajero
INSERT INTO mensajeros (nombre, telefono, placa) 
VALUES ('Nuevo Mensajero', '3001234567', 'DEF999');
```

## 🎯 Eso es todo

Sistema super simple:
- 2 tablas (mensajeros + envios)
- 1 trigger (actualiza estado automático)
- 3 campos obligatorios (mensajero, dirección, fecha)

Sin complicaciones de zonas, vehículos, calificaciones, GPS, etc.
