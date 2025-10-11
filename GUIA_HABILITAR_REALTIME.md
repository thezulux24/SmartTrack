# 🔔 HABILITAR NOTIFICACIONES PUSH (Realtime)

## 🚨 PROBLEMA ACTUAL

- ✅ Los **mensajes del chat** se actualizan al instante (tienen Realtime)
- ❌ Las **notificaciones** NO se actualizan sin refrescar (falta Realtime)
- ✅ Las notificaciones SÍ se guardan en la base de datos
- ❌ El badge de la campanita NO se actualiza solo

**Causa**: La tabla `notificaciones` **NO tiene Realtime habilitado** en Supabase.

---

## ⚡ SOLUCIÓN RÁPIDA (2 minutos)

### MÉTODO 1: Desde Supabase Dashboard (RECOMENDADO)

#### Paso 1: Abrir Supabase
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto: `smartTrack` o el que uses

#### Paso 2: Ir a Replication
1. En el menú lateral, haz clic en **"Database"**
2. Busca la pestaña **"Replication"** (o **"Publications"**)
3. Verás una lista de tablas

#### Paso 3: Habilitar para `notificaciones`
1. **Busca** la tabla `notificaciones` en la lista
2. **Activa el toggle/switch** al lado de `notificaciones`
3. El toggle debe quedar en **VERDE** o **ON**
4. ✅ ¡Listo! Realtime está habilitado

#### Verificación Visual:
```
┌─────────────────────────────────────────┐
│  Replication > Publication: supabase_re │
├─────────────────────────────────────────┤
│  Table Name           Realtime Status   │
├─────────────────────────────────────────┤
│  cirugias             ⚪ OFF             │
│  kits_cirugia         ⚪ OFF             │
│  mensajes_cirugia     🟢 ON   ← Ya está │
│  notificaciones       ⚪ OFF   ← AQUÍ!   │  <-- Activar este
│  usuarios             ⚪ OFF             │
└─────────────────────────────────────────┘

DESPUÉS DE ACTIVAR:
│  notificaciones       🟢 ON   ← ✅ Listo!│
```

---

### MÉTODO 2: Desde SQL Editor (ALTERNATIVA)

Si no encuentras la opción de Replication en el Dashboard:

#### Paso 1: Abrir SQL Editor
1. En Supabase Dashboard
2. Haz clic en **"SQL Editor"** en el menú lateral
3. Se abrirá un editor de código

#### Paso 2: Ejecutar SQL
1. **Copia TODO el contenido** del archivo: `enable_realtime_notificaciones.sql`
2. **Pégalo** en el SQL Editor
3. Haz clic en **"Run"** o presiona `Ctrl+Enter`

#### Paso 3: Verificar Resultado
Deberías ver 4 resultados:

**Query 1** (Estado ANTES):
```
tablename        | estado_actual
-----------------|-----------------------------
notificaciones   | ❌ NO está habilitado
```

**Query 2** (Habilitando):
```
NOTICE: ✅ Realtime habilitado para notificaciones
```

**Query 3** (Estado DESPUÉS):
```
tablename        | estado_final
-----------------|-----------------------------
notificaciones   | ✅ Realtime HABILITADO correctamente
```

**Query 4** (Todas las tablas con Realtime):
```
tablename              | status
-----------------------|------------------
mensajes_cirugia       | ✅ Realtime activo
notificaciones         | ✅ Realtime activo  ← Debe aparecer aquí
```

---

## 🧪 PRUEBA QUE FUNCIONA

### Prueba 1: Verificar en Consola del Navegador

1. **Abre la app** (si ya estaba abierta, refresca F5)
2. **Abre la consola** (F12)
3. Deberías ver estos logs:

```
🔌 NotificationService: Creating realtime subscription for user: [UUID]
📡 Channel name: notifications:[UUID]
🔌 NotificationService: Subscription status: SUBSCRIBED
✅ NotificationService: Successfully subscribed to realtime!
⏳ Waiting for new notifications...
```

**Si NO ves "SUBSCRIBED"**, Realtime no está habilitado aún.

### Prueba 2: Test en Vivo

#### Escenario A: Una sola ventana
1. **Abre la app**
2. **Abre Supabase SQL Editor** en otra pestaña
3. En SQL Editor, ejecuta:
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
  '[TU-USER-ID-AQUI]',  -- Cámbialo por tu ID
  'sistema',
  'high',
  'Test Realtime',
  'Si ves esto instantáneamente, Realtime funciona! 🎉',
  '🧪',
  'text-blue-500',
  false
);
```

4. **Vuelve a la app** (NO refresques)
5. **En 1-2 segundos** deberías ver:
   - 🍞 **Toast flotante** con la notificación
   - 🔴 **Badge rojo** en la campanita con número
   - 📬 **En consola**: "✨ REALTIME EVENT RECEIVED! ✨"

#### Escenario B: Dos usuarios (MEJOR)
1. **Abre 2 navegadores** o 2 ventanas incógnito
2. **Usuario A**: Inicia sesión
3. **Usuario B**: Inicia sesión (diferente usuario)
4. **Usuario A**: Envía un mensaje en un chat compartido
5. **Usuario B**: Debería ver la notificación **INSTANTÁNEAMENTE** sin refrescar

---

## 🐛 TROUBLESHOOTING

### ❌ Problema: "Subscription status: CHANNEL_ERROR"

**Causa**: Realtime NO está habilitado en Supabase

**Solución**:
1. Ve a Dashboard → Database → Replication
2. Activa el toggle para `notificaciones`
3. Refresca la app (F5)

---

### ❌ Problema: "Subscription status: TIMED_OUT"

**Causa**: Problemas de conexión o configuración

**Solución**:
1. Verifica tu conexión a internet
2. Refresca la app (F5)
3. Si persiste, revisa que Supabase esté funcionando

---

### ❌ Problema: No veo logs de subscripción en consola

**Causa**: El servicio no se inicializó

**Solución**:
1. Verifica que estás en la página `/internal/home`
2. Revisa que iniciaste sesión correctamente
3. Abre consola ANTES de cargar la app
4. Refresca (F5) y observa

---

### ❌ Problema: "duplicate_object" al ejecutar SQL

**Causa**: Realtime ya estaba habilitado

**Solución**: ¡Perfecto! Ya estaba habilitado. Solo verifica los logs en consola.

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### ANTES (Sin Realtime)
```
Usuario A envía mensaje
       ↓
Se crea notificación en BD
       ↓
Usuario B NO ve nada
       ↓
Usuario B refresca (F5)  ← Manual
       ↓
Usuario B ve notificación ❌
```

### DESPUÉS (Con Realtime)
```
Usuario A envía mensaje
       ↓
Se crea notificación en BD
       ↓
Supabase envía evento Realtime ⚡
       ↓
Usuario B recibe evento al instante
       ↓
🍞 Toast aparece automáticamente
🔴 Badge se actualiza automáticamente
✅ TODO automático, sin refrescar
```

---

## ✅ CHECKLIST FINAL

Marca cada paso cuando lo completes:

- [ ] **Paso 1**: Habilité Realtime en Supabase Dashboard
      - Método: Dashboard → Database → Replication → notificaciones → ON
      
- [ ] **Paso 2**: Refresqué la aplicación (F5)

- [ ] **Paso 3**: Abrí la consola (F12) y vi:
      ```
      ✅ NotificationService: Successfully subscribed to realtime!
      ```

- [ ] **Paso 4**: Probé enviar un mensaje

- [ ] **Paso 5**: Vi el toast aparecer automáticamente 🍞

- [ ] **Paso 6**: Vi el badge actualizarse automáticamente 🔴

---

## 🎯 RESULTADO ESPERADO

Después de habilitar Realtime, deberías ver en la consola:

```javascript
🔌 NotificationService: Creating realtime subscription for user: abc-123-def
📡 Channel name: notifications:abc-123-def
🔌 NotificationService: Subscription status: SUBSCRIBED  ← IMPORTANTE!
✅ NotificationService: Successfully subscribed to realtime!
⏳ Waiting for new notifications...

// Cuando llega una notificación:
📬 NotificationService: ✨ REALTIME EVENT RECEIVED! ✨
📬 Payload: { new: { id: '...', title: 'Nuevo mensaje', ... } }
🎉 NotificationService: Handling new notification
🍞 NotificationService: Showing toast
```

---

## 🚀 SIGUIENTE PASO

**AHORA MISMO**:
1. Ve a Supabase Dashboard
2. Database → Replication
3. Activa `notificaciones`
4. Refresca la app
5. ¡Disfruta de notificaciones en tiempo real! 🎉

---

## 💡 NOTAS IMPORTANTES

- ✅ No necesitas reiniciar el servidor de Angular
- ✅ Solo necesitas refrescar el navegador (F5) después de habilitar
- ✅ El cambio es instantáneo en Supabase
- ✅ Afecta a todos los usuarios inmediatamente
- ⚠️ Si deshabilitas RLS, no olvides re-habilitarlo después con `fix_rls_notificaciones.sql`

---

**¿Funcionó?** 🎉  
**¿Problemas?** Revisa la sección Troubleshooting o envía la salida de consola.
