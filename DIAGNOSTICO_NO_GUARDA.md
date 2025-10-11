# 🔍 DIAGNÓSTICO RÁPIDO - No se guardan notificaciones

## 🎯 Problema Identificado
La tabla `notificaciones` existe en Supabase pero **no se guardan datos** cuando envías un mensaje.

---

## ✅ SOLUCIÓN EN 3 PASOS

### PASO 1: Test Manual en Supabase (5 min)

#### 1.1 Obtener tu User ID
```sql
-- Ejecuta esto en Supabase SQL Editor
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as nombre
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado:** Copia tu `id` (es un UUID como: `abc-123-xyz-789`)

#### 1.2 Insertar Notificación de Prueba
```sql
-- Reemplaza 'TU-USER-ID' con el ID que copiaste
INSERT INTO public.notificaciones (
  user_id,
  type,
  priority,
  title,
  message,
  icon,
  icon_color,
  link,
  data,
  read
) VALUES (
  'TU-USER-ID-AQUI',  -- ← PEGAR TU ID AQUÍ
  'sistema',
  'high',
  '🎉 Test Manual Exitoso',
  'Si ves esto en tu app, el problema está en el código, no en la base de datos',
  '🎉',
  'text-blue-500',
  '/internal/chat',
  '{"test": true}'::jsonb,
  false
);
```

#### 1.3 Verificar Resultado

**✅ SI APARECE en tu app:**
- Toast flotante
- Badge con contador
- Notificación en panel
→ **El problema es que chat.service NO está llamando a createNotification**

**❌ SI NO APARECE:**
- Ver errores en SQL
- Verificar RLS policies
- Ver console del navegador

---

### PASO 2: Ver Console del Navegador (F12)

Ahora que agregué logging detallado, busca estos mensajes cuando envíes un mensaje:

#### Mensajes Esperados:
```
💬 ChatService: notifyParticipants called for message xyz
💬 ChatService: Current user is abc-123
💬 ChatService: Cirugia info {...}
💬 ChatService: Total participants to notify: 1
💬 ChatService: Calling notifyNewMessage with: {...}
📨 NotificationService.notifyNewMessage called with: {...}
🔨 NotificationService.createNotification called: {...}
📝 NotificationService: Inserting notification: {...}
✅ NotificationService.createNotification: Success!
✅ ChatService: Notifications sent successfully
```

#### Si NO ves estos mensajes:
1. **No aparece "notifyParticipants"** → Chat.service no se está ejecutando
2. **No aparece "Total participants: 1"** → No hay otros usuarios en la cirugía
3. **Aparece error "❌"** → Hay un problema específico (copia el error)

---

### PASO 3: Verificar Participantes

El sistema **NO te notifica a ti mismo**. Necesitas:

#### Opción A: Asignar otro usuario
```sql
-- Ver cirugías sin técnico asignado
SELECT 
  id,
  numero_cirugia,
  usuario_creador_id,
  tecnico_asignado_id
FROM cirugias
WHERE tecnico_asignado_id IS NULL
LIMIT 5;

-- Asignar técnico diferente
UPDATE cirugias
SET tecnico_asignado_id = 'OTRO-USER-ID'  -- ← ID de otro usuario
WHERE id = 'ID-DE-TU-CIRUGIA';
```

#### Opción B: Usar 2 navegadores
```
1. Chrome → Login Usuario A (comercial)
2. Firefox → Login Usuario B (técnico)
3. Usuario A envía mensaje
4. Usuario B debe recibir notificación
```

---

## 🔧 Archivos Actualizados

He agregado **logging completo** en:

### notification.service.ts
- ✅ Log en `initialize()`
- ✅ Log en `loadNotifications()`
- ✅ Log en `subscribeToNotifications()`
- ✅ Log en `createNotification()`
- ✅ Log en `notifyNewMessage()`
- ✅ Log en `handleNewNotification()`

### chat.service.ts
- ✅ Log en `notifyParticipants()`
- ✅ Log de participantes encontrados
- ✅ Log antes de llamar `notifyNewMessage()`

Ahora **verás exactamente** dónde se detiene el proceso.

---

## 📊 Checklist de Verificación

### Base de Datos
- [ ] Ejecuté `notificaciones_schema.sql` completo
- [ ] Tabla `notificaciones` existe
- [ ] RLS policies activas (4 policies)
- [ ] Realtime habilitado para la tabla
- [ ] Test manual (INSERT) funciona

### Código Frontend
- [ ] `ng serve` está corriendo
- [ ] No hay errores de compilación
- [ ] Console abierta (F12)
- [ ] Veo logs de inicialización (🔔)

### Prueba
- [ ] Tengo 2 usuarios diferentes
- [ ] Cirugía tiene técnico asignado
- [ ] Envío mensaje como usuario A
- [ ] Veo logs en console (💬, 📨, 🔨)
- [ ] Usuario B recibe notificación

---

## 🎯 Próximos Pasos

### 1. Ejecuta el Test Manual (PASO 1)
```bash
Archivo: test_notificacion_directa.sql
1. Obtener tu user_id
2. Insertar notificación
3. ¿Aparece en la app?
```

### 2. Revisa Console (PASO 2)
```bash
1. F12 en navegador
2. Enviar mensaje
3. Copiar logs completos
4. Buscar errores ❌
```

### 3. Verifica Participantes (PASO 3)
```bash
1. ¿Hay técnico asignado?
2. ¿Es diferente de ti?
3. Si no, asignar otro usuario
```

---

## 🆘 Errores Comunes

### Error 1: "No participants to notify"
```
❌ CAUSA: Eres el único usuario en la cirugía
✅ SOLUCIÓN: Asignar técnico diferente (PASO 3)
```

### Error 2: "permission denied for table notificaciones"
```
❌ CAUSA: RLS policies incorrectas
✅ SOLUCIÓN: Re-ejecutar notificaciones_schema.sql
```

### Error 3: "relation notificaciones does not exist"
```
❌ CAUSA: No ejecutaste el SQL
✅ SOLUCIÓN: Ejecutar notificaciones_schema.sql COMPLETO
```

### Error 4: Test manual funciona pero chat no
```
❌ CAUSA: chat.service no llama a notifyParticipants
✅ SOLUCIÓN: Ver logs en console, el problema está en el código
```

---

## 📞 Dame Esta Info

Para ayudarte mejor, necesito:

1. **Resultado del test manual** (PASO 1)
   - ¿El INSERT funcionó?
   - ¿Apareció notificación en app?

2. **Logs de console** (PASO 2)
   - Copia TODO el output al enviar mensaje
   - Especialmente los mensajes con 💬 📨 🔨 ❌

3. **Info de cirugía**
   ```sql
   SELECT 
     usuario_creador_id,
     tecnico_asignado_id
   FROM cirugias 
   WHERE id = 'TU-CIRUGIA-ID';
   ```

Con eso podré decirte exactamente qué está fallando! 🔍
