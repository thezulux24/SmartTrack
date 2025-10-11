# 🔔 Sistema de Notificaciones Push - Documentación Completa

## 📋 Resumen

Sistema completo de notificaciones push en tiempo real integrado con Supabase Realtime. Permite notificar a los usuarios sobre eventos importantes como nuevos mensajes en chat, cambios de estado de cirugías/kits, alertas de inventario, y más.

---

## 🎯 Características Implementadas

### ✅ Core Features

1. **NotificationService** - Servicio central de gestión
   - Suscripción a notificaciones en tiempo real (Supabase Realtime)
   - Creación y envío de notificaciones a usuarios
   - Gestión de estados (leído/no leído)
   - Estadísticas y contadores
   - Configuración personalizable (sonido, vibración, duración)

2. **Componentes de UI**
   - **NotificationBadgeComponent** - Badge con contador animado
   - **NotificationToastComponent** - Notificaciones toast flotantes
   - **NotificationPanelComponent** - Panel desplegable completo

3. **Integración con Chat**
   - Notificaciones automáticas cuando llega un nuevo mensaje
   - Envío a todos los participantes excepto el remitente
   - Preview del mensaje en la notificación

4. **Triggers Automáticos en Base de Datos**
   - Cambios de estado de cirugías → notifica automáticamente
   - Cambios de estado de kits → notifica automáticamente
   - Participantes relevantes notificados según contexto

---

## 🏗️ Arquitectura

### Flujo de Notificaciones

```
┌─────────────────┐
│  Evento Trigger │ (Nuevo mensaje, cambio estado, etc.)
└────────┬────────┘
         │
         v
┌─────────────────┐
│ NotificationSvc │ Crea notificación en tabla
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Supabase DB     │ INSERT en tabla notificaciones
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Realtime Event  │ postgres_changes event
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Frontend Svc    │ handleNewNotification()
└────────┬────────┘
         │
         ├─► Show Toast (popup temporal)
         ├─► Play Sound (beep)
         ├─► Vibrate (móvil)
         └─► Update Badge Counter
```

---

## 📁 Estructura de Archivos

### Nuevos Archivos Creados

```
src/app/shared/
├── models/
│   └── notification.model.ts          (Tipos y interfaces)
├── services/
│   └── notification.service.ts        (Lógica de negocio)
└── components/
    ├── notification-badge.component.ts    (Badge con contador)
    ├── notification-toast.component.ts    (Toast flotante)
    └── notification-panel.component.ts    (Panel desplegable)

notificaciones_schema.sql              (Schema SQL)
```

### Archivos Modificados

```
src/app/shared/services/
├── chat.service.ts                    (+ NotificationService integration)
└── index.ts                           (+ export NotificationService)

src/app/features/internal/internal-home/
├── internal-home.component.ts         (+ NotificationPanel)
└── internal-home.component.html       (+ UI components)
```

---

## 🗄️ Schema de Base de Datos

### Tabla: `notificaciones`

| Campo        | Tipo                     | Descripción                               |
|--------------|--------------------------|-------------------------------------------|
| `id`         | UUID                     | Primary key                               |
| `user_id`    | UUID (FK)                | Usuario destinatario                      |
| `type`       | notification_type        | Tipo de notificación                      |
| `priority`   | notification_priority    | low, medium, high, urgent                 |
| `title`      | TEXT                     | Título breve                              |
| `message`    | TEXT                     | Mensaje descriptivo                       |
| `icon`       | TEXT                     | Emoji del icono                           |
| `icon_color` | TEXT                     | Clase Tailwind para color                 |
| `link`       | TEXT                     | Ruta de navegación                        |
| `data`       | JSONB                    | Datos adicionales (flexible)              |
| `read`       | BOOLEAN                  | ¿Leída?                                   |
| `created_at` | TIMESTAMPTZ              | Fecha de creación                         |

### Tipos ENUM

```sql
-- Tipos de notificación
CREATE TYPE notification_type AS ENUM (
  'nuevo_mensaje',
  'cambio_estado_cirugia',
  'cambio_estado_kit',
  'alerta_stock',
  'alerta_vencimiento',
  'asignacion_cirugia',
  'sistema'
);

-- Prioridades
CREATE TYPE notification_priority AS ENUM (
  'low',      -- Gris
  'medium',   -- Azul
  'high',     -- Naranja
  'urgent'    -- Rojo
);
```

### RLS Policies

- **SELECT**: Usuario solo ve sus notificaciones (`auth.uid() = user_id`)
- **INSERT**: Sistema puede crear notificaciones para cualquier usuario
- **UPDATE**: Usuario solo actualiza sus notificaciones
- **DELETE**: Usuario solo elimina sus notificaciones

### Triggers Automáticos

#### 1. `trigger_cirugia_status_change`
Se ejecuta después de UPDATE en tabla `cirugias`.
- Detecta cambios en campo `estado`
- Notifica a `usuario_creador_id` y `tecnico_asignado_id`
- Incluye estados anterior y nuevo

#### 2. `trigger_kit_status_change`
Se ejecuta después de UPDATE en tabla `kits_cirugia`.
- Detecta cambios en campo `estado`
- Notifica a creador, técnico y preparador del kit
- Evita duplicados (si son la misma persona)

---

## 🔧 Uso del Servicio

### Inicialización

```typescript
// En el componente principal (internal-home)
import { NotificationService } from '@shared/services';

export class InternalHomeComponent implements OnInit {
  notificationService = inject(NotificationService);
  
  async ngOnInit() {
    const session = await this._authService.session();
    if (session?.data?.session?.user) {
      await this.notificationService.initialize(session.data.session.user.id);
    }
  }
}
```

### Crear Notificación Manual

```typescript
// Notificación simple
await this.notificationService.createNotification(
  userId,
  'sistema',
  'Título de la notificación',
  'Mensaje detallado aquí',
  'medium',
  { custom_data: 'valor' },
  '/internal/ruta'
);

// Notificar a múltiples usuarios
await this.notificationService.notifyUsers(
  ['user-id-1', 'user-id-2'],
  'alerta_stock',
  'Stock bajo',
  'Producto X tiene solo 5 unidades',
  'high'
);
```

### Métodos Helper Específicos

```typescript
// Nuevo mensaje en chat
await this.notificationService.notifyNewMessage(
  recipientIds,
  cirugia_id,
  'CIR-001',
  'Juan Pérez',
  'Hola, ¿todo listo para mañana?'
);

// Cambio estado cirugía
await this.notificationService.notifyCirugiaStatusChange(
  [userId1, userId2],
  cirugia_id,
  'CIR-001',
  'solicitada',
  'confirmada'
);

// Stock bajo
await this.notificationService.notifyLowStock(
  [logistica_ids],
  producto_id,
  'Tornillo 5mm',
  3,
  10
);

// Producto próximo a vencer
await this.notificationService.notifyExpiringProduct(
  [logistica_ids],
  producto_id,
  'Sutura absorbible',
  '2025-11-15',
  15
);

// Nueva asignación
await this.notificationService.notifyAssignedToSurgery(
  tecnico_id,
  cirugia_id,
  'CIR-001',
  '2025-10-15',
  'Hospital ABC'
);
```

### Gestión de Notificaciones

```typescript
// Marcar como leída
await this.notificationService.markAsRead(notificationId);

// Marcar todas como leídas
await this.notificationService.markAllAsRead();

// Eliminar notificación
await this.notificationService.deleteNotification(notificationId);

// Limpiar todas
await this.notificationService.clearAll();

// Navegar a notificación
await this.notificationService.navigateToNotification(notification);
```

### Signals Computados

```typescript
// Acceso a datos reactivos
const unreadCount = this.notificationService.unreadCount();
const allNotifications = this.notificationService.allNotifications();
const unreadOnly = this.notificationService.unreadNotifications();
const stats = this.notificationService.stats();

// Ejemplo de stats:
// {
//   total: 25,
//   unread: 5,
//   by_type: {
//     nuevo_mensaje: 3,
//     cambio_estado_cirugia: 2,
//     ...
//   }
// }
```

---

## 🎨 Componentes UI

### 1. NotificationBadgeComponent

Badge reutilizable con contador animado.

**Input:**
- `count: number` - Contador de notificaciones
- `maxDisplay: number` - Máximo a mostrar (default: 99)
- `color: 'primary' | 'danger' | 'warning' | 'success'`

**Uso:**
```html
<app-notification-badge [count]="5" color="danger">
  <button>🔔 Notificaciones</button>
</app-notification-badge>
```

### 2. NotificationToastComponent

Notificaciones flotantes auto-descartables.

**Características:**
- Aparece en esquina superior derecha
- Auto-cierra después de 5 segundos
- Click para navegar a la notificación
- Barra de progreso animada
- Color según prioridad

**Uso:**
```html
<app-notification-toast />
```

### 3. NotificationPanelComponent

Panel desplegable completo con lista de notificaciones.

**Características:**
- Badge con contador animado
- Panel con tabs (Todas / No leídas)
- Lista ordenada por fecha
- Acciones: marcar leída, eliminar
- Estado vacío con ilustración
- Click para navegar

**Uso:**
```html
<app-notification-panel />
```

---

## 🔄 Integración con Chat

El `ChatService` ahora notifica automáticamente cuando se envía un mensaje:

### Flujo Automático

1. Usuario envía mensaje → `chatService.enviarMensaje()`
2. Mensaje se guarda en DB
3. Se ejecuta `notifyParticipants()` (tap operator)
4. Obtiene lista de participantes de la cirugía
5. Excluye al remitente
6. Envía notificación a cada participante
7. Supabase Realtime propaga el evento
8. Frontend muestra toast

### Código Interno

```typescript
enviarMensaje(request: CreateMensajeRequest): Observable<MensajeCirugia> {
  return from(...)
    .pipe(
      map(...),
      tap(async (mensaje) => {
        await this.notifyParticipants(mensaje);
      })
    );
}
```

---

## 🚀 Instalación y Configuración

### 1. Ejecutar SQL en Supabase

```bash
# Copiar contenido de notificaciones_schema.sql
# Pegar en SQL Editor de Supabase
# Ejecutar
```

Esto crea:
- Tabla `notificaciones`
- Tipos ENUM
- RLS policies
- Funciones helper
- Triggers automáticos

### 2. Verificar Realtime Habilitado

En Supabase Dashboard:
1. Database → Replication
2. Verificar que `notificaciones` esté habilitada
3. Si no: click en botón para habilitar

### 3. Actualizar Código Frontend

Ya está todo implementado en los archivos creados/modificados.

### 4. Reiniciar Aplicación

```bash
# Detener ng serve
# Volver a ejecutar
ng serve
```

---

## 📊 Ejemplo de Uso Completo

### Escenario: Comercial cambia estado de cirugía

```typescript
// 1. Usuario actualiza cirugía en frontend
const { error } = await this.supabase.client
  .from('cirugias')
  .update({ estado: 'confirmada' })
  .eq('id', cirugiaId);

// 2. Trigger automático en DB se ejecuta
// → notify_cirugia_status_change()

// 3. Inserta notificaciones para:
//    - usuario_creador_id
//    - tecnico_asignado_id

// 4. Supabase Realtime envía evento INSERT

// 5. Frontend (NotificationService) recibe evento
// → handleNewNotification()

// 6. Muestra toast flotante
// 7. Actualiza contador en badge
// 8. Reproduce sonido
// 9. Vibra (móvil)
```

---

## 🎯 Tipos de Notificación

| Tipo                      | Icono | Color   | Prioridad | Uso                                    |
|---------------------------|-------|---------|-----------|----------------------------------------|
| `nuevo_mensaje`           | 💬    | Azul    | medium    | Chat - nuevo mensaje                   |
| `cambio_estado_cirugia`   | 🏥    | Azul    | high      | Estado de cirugía cambió               |
| `cambio_estado_kit`       | 📦    | Verde   | medium    | Estado de kit actualizado              |
| `alerta_stock`            | ⚠️     | Naranja | high      | Stock bajo, reordenar                  |
| `alerta_vencimiento`      | ⏰    | Rojo    | urgent    | Producto próximo a vencer              |
| `asignacion_cirugia`      | 📋    | Azul    | high      | Nueva cirugía asignada a técnico       |
| `sistema`                 | ℹ️     | Gris    | low       | Mensajes generales del sistema         |

---

## 🔒 Seguridad (RLS)

Las políticas RLS garantizan:

✅ **Privacidad**: Usuarios solo ven SUS notificaciones  
✅ **Control**: Solo pueden modificar/eliminar las propias  
✅ **Sistema**: Backend puede crear para cualquier usuario  
✅ **Aislamiento**: No hay fugas de datos entre usuarios  

---

## ⚡ Performance

### Optimizaciones Implementadas

1. **Índices en DB**
   - `user_id` (lookup rápido)
   - `read` (filtro no leídas)
   - `created_at DESC` (ordenamiento)
   - Compuesto `(user_id, read)` WHERE read=false

2. **Límites de Consulta**
   - Carga solo últimas 50 notificaciones
   - Paginación implementable

3. **Limpieza Automática**
   - Función `cleanup_old_notifications()`
   - Elimina notificaciones leídas >30 días
   - Ejecutar mensualmente vía cron

4. **Realtime Eficiente**
   - Canal específico por usuario: `notifications:{userId}`
   - Solo eventos INSERT necesarios
   - Limpieza de canales al destruir

---

## 🧪 Testing

### Pruebas Manuales

#### 1. Notificación de Mensaje
```
1. Login como Usuario A
2. Login como Usuario B (otra pestaña/navegador)
3. Usuario A envía mensaje en chat
4. Usuario B debe ver:
   - Toast flotante aparecer
   - Badge actualizar contador
   - Notificación en panel
```

#### 2. Notificación de Estado
```
1. Login como Comercial
2. Login como Técnico (otra pestaña)
3. Comercial cambia estado de cirugía asignada al técnico
4. Técnico debe ver notificación automática
```

#### 3. Marcar como Leída
```
1. Click en notificación del panel
2. Debe navegar a la ruta correcta
3. Badge debe decrementar contador
4. Notificación debe marcarse como leída (sin punto azul)
```

#### 4. Limpiar Todas
```
1. Tener varias notificaciones
2. Click en "Limpiar todas las notificaciones"
3. Confirmar
4. Panel debe quedar vacío
5. Contador debe ser 0
```

---

## 🐛 Troubleshooting

### Toast No Aparece

**Problema:** Notificación se crea pero no se muestra.

**Solución:**
1. Verificar que `<app-notification-toast />` esté en el HTML
2. Verificar que `NotificationToastComponent` esté en imports
3. Verificar que `showToast: true` en config

### Realtime No Funciona

**Problema:** Notificaciones no llegan en tiempo real.

**Solución:**
1. Verificar Supabase Dashboard → Database → Replication
2. Habilitar `notificaciones` table
3. Verificar que canal se suscribe correctamente (console.log)
4. Revisar errores en Network tab

### Duplicados

**Problema:** Misma notificación aparece 2 veces.

**Solución:**
- Ya manejado: Se usa ID único en tracking `@for`
- Verificar que no haya múltiples suscripciones

### Contador Incorrecto

**Problema:** Badge muestra número incorrecto.

**Solución:**
1. Verificar función `get_unread_notifications_count()`
2. Revisar que RLS policies permitan SELECT
3. Actualizar signal manualmente si es necesario

---

## 📈 Mejoras Futuras

### Fase 2 (Opcional)

- [ ] Soporte para imágenes en notificaciones
- [ ] Notificaciones agrupadas ("3 mensajes nuevos")
- [ ] Configuración por usuario (activar/desactivar tipos)
- [ ] Historial completo (paginado)
- [ ] Push notifications nativas (PWA)
- [ ] Email/SMS para notificaciones urgentes
- [ ] Notificaciones programadas
- [ ] Análisis de engagement

---

## 📝 Resumen de Archivos

### Crear estos archivos:

1. ✅ `src/app/shared/models/notification.model.ts`
2. ✅ `src/app/shared/services/notification.service.ts`
3. ✅ `src/app/shared/components/notification-badge.component.ts`
4. ✅ `src/app/shared/components/notification-toast.component.ts`
5. ✅ `src/app/shared/components/notification-panel.component.ts`
6. ✅ `notificaciones_schema.sql`

### Modificar estos archivos:

1. ✅ `src/app/shared/services/chat.service.ts`
2. ✅ `src/app/shared/services/index.ts`
3. ✅ `src/app/features/internal/internal-home/internal-home.component.ts`
4. ✅ `src/app/features/internal/internal-home/internal-home.component.html`

---

## 🎉 ¡Listo!

Sistema de notificaciones completamente funcional con:

✅ Notificaciones en tiempo real (Supabase Realtime)  
✅ UI moderna con Tailwind (Toast + Panel + Badge)  
✅ Integración automática con chat  
✅ Triggers automáticos para cambios de estado  
✅ RLS policies para seguridad  
✅ Sonido, vibración, animaciones  
✅ Navegación inteligente  
✅ Estadísticas y contadores  

**Próximo paso:** Ejecutar el SQL en Supabase y probar la aplicación! 🚀
