# 🔒 SOLUCIÓN: RLS VIOLATION EN NOTIFICACIONES

## 🚨 Error Actual
```
code: '42501'
message: 'new row violates row-level security policy for table "notificaciones"'
```

**Causa**: Las políticas RLS están bloqueando el INSERT de notificaciones.

---

## 📋 SOLUCIÓN EN 3 PASOS

### ✅ PASO 1: Verificar Estado Actual

Ve a **Supabase SQL Editor** y ejecuta:

```sql
-- Archivo: verificar_rls_notificaciones.sql
```

Esto te mostrará:
- ✅ Si RLS está habilitado
- 📋 Qué políticas existen
- 👤 Quién es el owner de la tabla

---

### ✅ PASO 2: Arreglar Políticas RLS

**Opción A: Recrear políticas (RECOMENDADO)**

Ve a **Supabase SQL Editor** y ejecuta TODO el contenido de:

```sql
-- Archivo: fix_rls_notificaciones.sql
```

Este script:
1. ❌ Elimina políticas antiguas/incorrectas
2. ✅ Crea 4 políticas nuevas correctas:
   - `SELECT` - Solo tus notificaciones
   - `INSERT` - Cualquier usuario autenticado puede insertar
   - `UPDATE` - Solo tus notificaciones
   - `DELETE` - Solo tus notificaciones

**Opción B: Deshabilitar RLS (SOLO PARA TESTING)**

Si la Opción A no funciona, ejecuta:

```sql
-- Archivo: disable_rls_notificaciones.sql
-- ⚠️ SOLO PARA DEBUGGING - NO USAR EN PRODUCCIÓN
```

---

### ✅ PASO 3: Probar en la Aplicación

1. **Refresca el navegador** (F5)
2. **Abre la consola** (F12)
3. **Envía un mensaje en el chat**
4. **Verifica los logs**:
   ```
   🔨 NotificationService.createNotification called
   📝 Inserting notification
   ✅ Success!  <-- Debe aparecer esto
   ```

5. **Verifica en Supabase**:
   ```sql
   SELECT * FROM notificaciones ORDER BY created_at DESC LIMIT 5;
   ```
   Deberías ver registros nuevos.

---

## 🔍 DIAGNÓSTICO DETALLADO

### ¿Por qué falló el RLS?

**Posibles causas**:

1. **No ejecutaste el SQL completo**
   - El archivo `notificaciones_schema.sql` (386 líneas) debe ejecutarse COMPLETO
   - Verifica que llegó hasta el final (triggers, funciones, etc.)

2. **La política de INSERT no existe**
   - Ejecuta `verificar_rls_notificaciones.sql` para confirmar
   - Si no ves política para `INSERT`, ese es el problema

3. **La política usa condición incorrecta**
   - La política debe tener `WITH CHECK (true)` para permitir cualquier INSERT
   - Si tiene otra condición, bloqueará inserts

4. **Usuario no está autenticado**
   - Verifica que `auth.uid()` retorna un UUID válido
   - Ejecuta en Supabase: `SELECT auth.uid();`

---

## 📊 VERIFICACIONES POST-ARREGLO

### Test 1: Verificar políticas creadas
```sql
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'notificaciones';
```

**Resultado esperado**:
```
policyname                              | cmd    | with_check
----------------------------------------|--------|------------
Authenticated users can insert...      | INSERT | true
Users can view their own...            | SELECT | (null)
Users can update their own...          | UPDATE | (auth.uid() = user_id)
Users can delete their own...          | DELETE | (null)
```

### Test 2: INSERT manual desde Supabase
```sql
INSERT INTO notificaciones (
  user_id, 
  type, 
  priority, 
  title, 
  message, 
  icon,
  icon_color,
  read
) VALUES (
  auth.uid(),
  'sistema',
  'high',
  'Test RLS Manual',
  'Probando desde SQL Editor',
  '🧪',
  'text-blue-500',
  false
)
RETURNING *;
```

**Si funciona**: El RLS está bien configurado ✅  
**Si falla**: Hay un problema con las políticas ❌

---

## 🆘 SOLUCIÓN DE EMERGENCIA

Si NADA funciona, puedes **deshabilitar RLS temporalmente**:

```sql
-- ⚠️ SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;
```

Luego prueba la app. Si funciona, confirma que el problema era RLS.

Después vuelve a habilitar:
```sql
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
```

Y ejecuta `fix_rls_notificaciones.sql` nuevamente.

---

## 📞 SIGUIENTE PASO

**Ejecuta ahora**:
1. Ve a Supabase Dashboard
2. Abre SQL Editor
3. Ejecuta **fix_rls_notificaciones.sql** COMPLETO
4. Verifica que dice "Query completed successfully"
5. Refresca la app y prueba

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar el fix, deberías ver:

**En la consola del navegador**:
```
💬 ChatService: notifyParticipants called
💬 ChatService: Total participants to notify: 1
📨 NotificationService.notifyNewMessage called
🔨 NotificationService.createNotification called
📝 Inserting notification: {...}
✅ NotificationService.createNotification: Success! 🎉
```

**En Supabase**:
```sql
SELECT COUNT(*) FROM notificaciones;
-- Resultado: > 0
```

**En la aplicación**:
- 🔴 Badge con número de notificaciones
- 🍞 Toast flotante aparece
- 📋 Panel de notificaciones muestra la lista

---

## ❓ FAQ

**P: ¿Por qué `WITH CHECK (true)`?**  
R: Permite que cualquier usuario autenticado inserte notificaciones para otros usuarios (necesario para el sistema de notificaciones).

**P: ¿Es seguro?**  
R: Sí, porque solo usuarios autenticados pueden insertar, y la política de SELECT asegura que cada usuario solo vea sus propias notificaciones.

**P: ¿Y si quiero más control?**  
R: Puedes cambiar `WITH CHECK (true)` por `WITH CHECK (user_id = auth.uid())` para que solo puedas crear notificaciones para ti mismo. Pero entonces el sistema de chat NO funcionará.

---

💡 **TIP**: Si sigues teniendo problemas, copia la salida de `verificar_rls_notificaciones.sql` y compártela.
