# 🔍 TROUBLESHOOTING - Notificaciones No Aparecen

## 🎯 Problema: "Envié un mensaje pero no aparece notificación"

### ✅ Pasos de Diagnóstico

---

## PASO 1: Verificar Console del Navegador

### 1.1 Abrir DevTools
```
1. Presiona F12 en el navegador
2. Ve a la pestaña "Console"
3. Busca mensajes que empiecen con estos iconos:
   🔔 = Notification Service
   💬 = Chat Service
   ❌ = Errores
```

### 1.2 Mensajes Esperados al Cargar la App
Deberías ver algo como:
```
🔔 Notification Service: Manual initialization for user abc-123-xyz
📥 NotificationService: Loading notifications for abc-123-xyz
✅ NotificationService: Loaded 0 notifications
🔌 NotificationService: Subscribing to realtime channel for abc-123-xyz
🔌 NotificationService: Subscription status: SUBSCRIBED
```

### 1.3 Mensajes Esperados al Enviar Mensaje
Deberías ver:
```
💬 ChatService: notifyParticipants called for message xyz-789
💬 ChatService: Current user is abc-123
💬 ChatService: Cirugia info { id: '...', numero_cirugia: 'CIR-001', ... }
💬 ChatService: Total participants to notify: 1
💬 ChatService: Calling notifyNewMessage with: { ... }
✅ ChatService: Notifications sent successfully
```

---

## PASO 2: Verificar Tabla en Supabase

### 2.1 Ejecutar SQL de Diagnóstico
```sql
1. Ir a Supabase Dashboard
2. SQL Editor
3. Copiar y ejecutar: diagnostico_notificaciones.sql
```

### 2.2 Verificar Resultados

#### ✅ Resultado Esperado:
```
1. tabla_existe: true
2. notification_type_existe: true
3. notification_priority_existe: true
4. 4 policies mostradas
5. tabla en replication
6. 3 funciones
7. 2 triggers
```

#### ❌ Si tabla_existe = false:
```
SOLUCIÓN: Ejecutar notificaciones_schema.sql completo
1. Abrir notificaciones_schema.sql
2. Seleccionar TODO (Ctrl+A)
3. Copiar (Ctrl+C)
4. Ir a Supabase → SQL Editor
5. Pegar (Ctrl+V)
6. Ejecutar (Ctrl+Enter)
7. Esperar "Success"
```

---

## PASO 3: Verificar Realtime Habilitado

### 3.1 Ir a Database Replication
```
1. Supabase Dashboard
2. Database → Replication
3. Buscar tabla: notificaciones
```

### 3.2 Verificar Switch
```
Si está OFF:
1. Activar el switch
2. Guardar cambios
3. Recargar la app (F5)
```

---

## PASO 4: Verificar RLS Policies

### 4.1 Ejecutar Query de Verificación
```sql
-- Ver policies de la tabla
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'notificaciones';
```

### 4.2 Resultado Esperado
Debe mostrar 4 policies:
1. Users can view their own notifications (SELECT)
2. System can insert notifications (INSERT)
3. Users can update their own notifications (UPDATE)
4. Users can delete their own notifications (DELETE)

### 4.3 Si NO aparecen:
```
SOLUCIÓN: Re-ejecutar notificaciones_schema.sql
```

---

## PASO 5: Verificar Participantes en la Cirugía

### 5.1 Verificar IDs de Usuarios
```sql
-- Ver usuarios de una cirugía específica
SELECT 
  id,
  numero_cirugia,
  usuario_creador_id,
  tecnico_asignado_id
FROM cirugias
WHERE numero_cirugia = 'TU-CIRUGIA-AQUI';
```

### 5.2 Verificar que NO seas el único
```
❌ PROBLEMA: Si usuario_creador_id = TU ID y tecnico_asignado_id es NULL
   → No hay otro usuario para notificar!
   
✅ SOLUCIÓN: Asignar un técnico diferente a la cirugía
```

---

## PASO 6: Probar con 2 Usuarios Reales

### 6.1 Configuración
```
1. Abrir navegador 1 (Chrome)
   - Login como Usuario A
   
2. Abrir navegador 2 (Firefox/Edge/Incognito)
   - Login como Usuario B
   
3. Asegurarse que:
   - Usuario A es creador de la cirugía
   - Usuario B es técnico asignado
   O viceversa
```

### 6.2 Prueba
```
1. Usuario A envía mensaje
2. En console de Usuario B debe aparecer:
   📬 NotificationService: Received new notification via realtime
   🎉 NotificationService: Handling new notification
   🍞 NotificationService: Showing toast
```

---

## PASO 7: Errores Comunes y Soluciones

### Error 1: "relation 'notificaciones' does not exist"
```
❌ CAUSA: No ejecutaste el SQL
✅ SOLUCIÓN: Ejecutar notificaciones_schema.sql en Supabase
```

### Error 2: "permission denied for table notificaciones"
```
❌ CAUSA: RLS policies no están bien configuradas
✅ SOLUCIÓN: 
   1. Verificar que RLS esté ENABLED
   2. Verificar que las 4 policies existan
   3. Re-ejecutar sección de RLS del SQL
```

### Error 3: Subscription status: "CHANNEL_ERROR"
```
❌ CAUSA: Realtime no está habilitado para la tabla
✅ SOLUCIÓN: 
   1. Supabase → Database → Replication
   2. Habilitar tabla notificaciones
   3. Recargar app (F5)
```

### Error 4: "No participants to notify (you are the only one)"
```
❌ CAUSA: Eres el único usuario en la cirugía
✅ SOLUCIÓN: 
   1. Asignar otro usuario como técnico
   2. O abrir 2 navegadores con usuarios diferentes
```

### Error 5: Toast no aparece pero console dice "Showing toast"
```
❌ CAUSA: Componente NotificationToastComponent no está en el HTML
✅ SOLUCIÓN: 
   1. Verificar en internal-home.component.html:
      <app-notification-toast />
   2. Verificar que esté en los imports del componente
```

### Error 6: Panel vacío pero hay notificaciones
```
❌ CAUSA: userId no se está pasando correctamente
✅ SOLUCIÓN: 
   1. Ver console: debe decir "Manual initialization for user ABC-123"
   2. Si no aparece, revisar internal-home.component.ts
   3. Verificar que initializeNotifications() se llame en ngOnInit
```

---

## PASO 8: Test Manual de Notificación

### 8.1 Crear Notificación Manualmente en SQL
```sql
-- Reemplaza 'TU-USER-ID' con tu ID real
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
  'TU-USER-ID',  -- ← CAMBIAR ESTO
  'sistema',
  'high',
  'Notificación de prueba',
  'Si ves esto, el sistema funciona!',
  '🎉',
  'text-blue-500',
  false
);
```

### 8.2 Resultado Esperado
```
✅ Inmediatamente debes ver:
   1. Toast flotante en pantalla
   2. Badge actualizado con (1)
   3. Notificación en el panel
   4. Console: "Received new notification via realtime"
```

### 8.3 Si NO aparece:
```
❌ Problema con Realtime
✅ Verificar:
   1. Realtime habilitado (PASO 3)
   2. Subscription status: SUBSCRIBED (ver console)
   3. Recargar app completamente (Ctrl+Shift+R)
```

---

## PASO 9: Verificar Estructura del HTML

### 9.1 Verificar internal-home.component.html
```html
Debe tener AMBOS componentes:

<!-- Al inicio del archivo -->
<app-notification-toast />

<!-- En el header -->
<app-notification-panel />
```

### 9.2 Verificar imports en .ts
```typescript
imports: [
  CommonModule, 
  RouterModule, 
  NotificationPanelComponent,   // ← Debe estar
  NotificationToastComponent     // ← Debe estar
]
```

---

## PASO 10: Reiniciar Todo

### 10.1 Hard Reset
```bash
1. Cerrar navegador completamente
2. En VS Code terminal:
   - Detener ng serve (Ctrl+C)
   - Ejecutar: ng serve
3. Abrir navegador nuevo
4. Login
5. Probar nuevamente
```

### 10.2 Clear Cache
```
1. F12 (DevTools)
2. Click derecho en botón de reload
3. "Empty Cache and Hard Reload"
4. Probar nuevamente
```

---

## 📊 Checklist de Verificación

Marca cada uno:

### Backend (Supabase)
- [ ] Tabla `notificaciones` existe
- [ ] Tipos ENUM existen
- [ ] 4 RLS policies activas
- [ ] Realtime habilitado para tabla
- [ ] 3 funciones creadas
- [ ] 2 triggers creados

### Frontend (Angular)
- [ ] NotificationService importado
- [ ] NotificationPanelComponent en HTML
- [ ] NotificationToastComponent en HTML
- [ ] initialize() se llama en ngOnInit
- [ ] Sin errores de compilación

### Testing
- [ ] Console muestra logs de inicialización
- [ ] Subscription status: SUBSCRIBED
- [ ] 2 usuarios diferentes en navegadores
- [ ] Usuarios tienen roles diferentes en cirugía
- [ ] Test manual con INSERT SQL funciona

---

## 🆘 Si Nada Funciona

### Última Opción: Reset Completo

```bash
1. En Supabase SQL Editor:
   -- Eliminar todo
   DROP TABLE IF EXISTS notificaciones CASCADE;
   DROP TYPE IF EXISTS notification_type CASCADE;
   DROP TYPE IF EXISTS notification_priority CASCADE;
   DROP FUNCTION IF EXISTS notify_cirugia_status_change CASCADE;
   DROP FUNCTION IF EXISTS notify_kit_status_change CASCADE;
   DROP FUNCTION IF EXISTS get_unread_notifications_count CASCADE;
   DROP FUNCTION IF EXISTS mark_all_notifications_read CASCADE;
   DROP FUNCTION IF EXISTS cleanup_old_notifications CASCADE;

2. Ejecutar notificaciones_schema.sql COMPLETO
3. Habilitar Realtime
4. Recargar app
5. Probar test manual (PASO 8)
```

---

## 📞 Información para Soporte

Si sigues teniendo problemas, proporciona:

```
1. Resultado de diagnostico_notificaciones.sql
2. Console logs completos (copiar texto)
3. Screenshot del error
4. Versión de Angular: ng version
5. Navegador y versión
6. ¿Ejecutaste notificaciones_schema.sql? Sí/No
7. ¿Realtime habilitado? Sí/No
8. ¿Test manual funciona? Sí/No
```

---

## ✅ Estado Normal (Todo Funciona)

Cuando todo funciona correctamente, debes ver:

### En Console
```
🔔 Notification Service: Manual initialization for user abc-123
📥 NotificationService: Loading notifications for abc-123
✅ NotificationService: Loaded 5 notifications
🔌 NotificationService: Subscribing to realtime channel
🔌 NotificationService: Subscription status: SUBSCRIBED

[Al enviar mensaje:]
💬 ChatService: notifyParticipants called
💬 ChatService: Total participants to notify: 1
✅ ChatService: Notifications sent successfully

[En el otro navegador:]
📬 NotificationService: Received new notification
🎉 NotificationService: Handling new notification
🍞 NotificationService: Showing toast
🔊 NotificationService: Playing sound
```

### En Pantalla
```
✅ Toast aparece arriba-derecha
✅ Badge muestra contador
✅ Panel tiene la notificación
✅ Sonido "beep"
✅ Navegación funciona al hacer click
```

---

¡Sigue estos pasos en orden y encontrarás el problema! 🔍
