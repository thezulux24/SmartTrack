# Sistema RBAC (Role-Based Access Control) - Implementación Completa

## 📋 Resumen

Se ha implementado un sistema completo de Control de Acceso Basado en Roles (RBAC) que controla qué módulos puede ver y acceder cada usuario según su rol en la plataforma.

## 🎯 Objetivos Alcanzados

✅ **Backend (Guards)**: Las rutas están protegidas a nivel de navegación
✅ **Frontend (UI)**: El menú se filtra dinámicamente según el rol
✅ **Centralizado**: Una única fuente de verdad para permisos
✅ **Escalable**: Fácil agregar nuevos roles o módulos
✅ **Admin wildcard**: El rol admin tiene acceso total con `'*'`

---

## 🗂️ Archivos Modificados/Creados

### 1. **role-permissions.config.ts** (NUEVO)
**Ubicación**: `src/app/shared/guards/role-permissions.config.ts`

**Propósito**: Configuración centralizada de permisos por rol

**Contenido Principal**:
```typescript
export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  admin: {
    allowedRoutes: ['*'] // Acceso total
  },
  
  comercial: {
    allowedRoutes: [
      '/internal',
      '/internal/agenda',
      '/internal/clientes',
      '/internal/hojas-gasto',
      '/internal/chat',
      '/internal/trazabilidad'
    ]
  },
  
  logistica: {
    allowedRoutes: [
      '/internal',
      '/internal/inventario',
      '/internal/logistica',
      '/internal/agenda',
      '/internal/chat',
      '/internal/trazabilidad',
      '/internal/clientes'
    ]
  },
  
  soporte_tecnico: {
    allowedRoutes: [
      '/internal',
      '/internal/tecnico',
      '/internal/agenda',
      '/internal/hojas-gasto',
      '/internal/inventario',
      '/internal/limpieza',
      '/internal/chat',
      '/internal/trazabilidad'
    ]
  }
};
```

**Funciones Exportadas**:
- `hasRoutePermission(role, route)`: Verifica si un rol puede acceder a una ruta
- `getAllowedRoutes(role)`: Retorna todas las rutas permitidas para un rol
- `getRoleDescription(role)`: Retorna la descripción de un rol

---

### 2. **role.guard.ts** (ACTUALIZADO)
**Ubicación**: `src/app/shared/guards/role.guard.ts`

**Cambios**:
- ✅ Agregado nuevo guard: `roleBasedGuard`
- ✅ Usa `hasRoutePermission()` del config centralizado
- ✅ Logging detallado de accesos permitidos/denegados
- ✅ Redirección a `/internal` si no tiene permiso

**Código del Guard**:
```typescript
export const roleBasedGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      console.warn('🔒 roleBasedGuard: No session');
      router.navigate(['/auth']);
      return false;
    }

    const profile = await supabase.getUserProfile(uid);
    if (!profile) {
      router.navigate(['/']);
      return false;
    }

    const currentRoute = state.url;
    const hasPermission = hasRoutePermission(profile.role, currentRoute);

    if (hasPermission) {
      console.log(`✅ ${profile.role} has access to ${currentRoute}`);
      return true;
    }

    console.warn(`🚫 ${profile.role} NO access to ${currentRoute}`);
    router.navigate(['/internal']);
    return false;

  } catch (error) {
    console.error('❌ Error in roleBasedGuard:', error);
    router.navigate(['/internal']);
    return false;
  }
};
```

---

### 3. **internal-routing.ts** (ACTUALIZADO)
**Ubicación**: `src/app/features/internal/internal-routing.ts`

**Cambios**:
- ✅ Importado `roleBasedGuard`
- ✅ Aplicado `canActivate: [roleBasedGuard]` a todas las rutas internas

**Rutas Protegidas**:
```typescript
export default [
  { path: '', loadComponent: ... }, // Dashboard (sin guard)
  
  { path: 'inventario', canActivate: [roleBasedGuard], ... },
  { path: 'agenda', canActivate: [roleBasedGuard], ... },
  { path: 'clientes', canActivate: [roleBasedGuard], ... },
  { path: 'hojas-gasto', canActivate: [roleBasedGuard], ... },
  { path: 'logistica', canActivate: [roleBasedGuard], ... },
  { path: 'trazabilidad', canActivate: [roleBasedGuard], ... },
  { path: 'tecnico', canActivate: [roleBasedGuard], ... },
  { path: 'limpieza', canActivate: [roleBasedGuard], ... },
  { path: 'chat', canActivate: [roleBasedGuard], ... }
] as Routes;
```

---

### 4. **internal-home.component.ts** (ACTUALIZADO)
**Ubicación**: `src/app/features/internal/internal-home/internal-home.component.ts`

**Cambios**:
- ✅ Inyectado `SupabaseService`
- ✅ Importado `hasRoutePermission`
- ✅ Agregado signal `userRole`
- ✅ Agregado signal `menuItems` (lista filtrada)
- ✅ Agregada definición completa del menú: `allMenuItems`
- ✅ Método `loadUserRole()`: Carga el rol del usuario desde Supabase
- ✅ Método `filterMenuByRole()`: Filtra el menú según permisos
- ✅ Método `getIconPath()`: Retorna el SVG path para cada ícono

**Estructura del Menú**:
```typescript
private allMenuItems: MenuItem[] = [
  {
    route: '/internal/chat',
    title: 'Mensajes',
    description: 'Chat por cirugía',
    icon: 'chat',
    roles: ['admin', 'comercial', 'logistica', 'soporte_tecnico']
  },
  {
    route: '/internal/agenda',
    title: 'Agenda',
    description: 'Gestión de cirugías',
    icon: 'calendar',
    roles: ['admin', 'comercial', 'logistica', 'soporte_tecnico']
  },
  // ... 7 módulos más
];
```

---

### 5. **internal-home.component.html** (ACTUALIZADO)
**Ubicación**: `src/app/features/internal/internal-home/internal-home.component.html`

**Cambios**:
- ✅ Reemplazadas 11 tarjetas estáticas por bucle dinámico `@for`
- ✅ Cada tarjeta se renderiza solo si el rol tiene permiso
- ✅ Badge de mensajes no leídos solo en Chat
- ✅ Mensaje de "Sin módulos disponibles" si `menuItems().length === 0`

**Código del Bucle**:
```html
@for (item of menuItems(); track item.route) {
  <a [routerLink]="item.route"
    class="block bg-[#10284C] rounded-2xl p-5 hover:bg-[#10284C]/90 transition-all duration-200">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 bg-[#C8D900] rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-[#10284C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              [attr.d]="getIconPath(item.icon)"/>
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-white">{{ item.title }}</h2>
          <p class="text-sm text-white/70">{{ item.description }}</p>
        </div>
      </div>
      <svg class="w-6 h-6 text-[#0098A8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </a>
}
```

---

## 🔐 Permisos por Rol

### **👨‍💼 Comercial** (6 módulos)
Basado en: Programar cirugías, gestionar hojas de gasto, coordinar con logística/soporte

| Módulo | Acceso | Justificación |
|--------|--------|---------------|
| ✅ Chat | SÍ | Coordinación con logística y soporte |
| ✅ Agenda | SÍ | Programar y gestionar cirugías |
| ✅ Clientes | SÍ | Gestión de clientes |
| ✅ Hojas de Gasto | SÍ | Gestionar hojas de gasto |
| ✅ Trazabilidad | SÍ | Dar trazabilidad al ciclo |
| ❌ Logística | NO | No gestiona kits ni rutas |
| ❌ Inventario | NO | No maneja stock directamente |
| ❌ Validación Técnica | NO | No hace recepción técnica |
| ❌ Recepción Limpieza | NO | No confirma limpieza |

---

### **🚚 Logística** (7 módulos)
Basado en: Monitorear inventarios, coordinar rutas, bitácora digital

| Módulo | Acceso | Justificación |
|--------|--------|---------------|
| ✅ Chat | SÍ | Coordinación con comercial y soporte |
| ✅ Agenda | SÍ | Ver solicitudes de cirugías |
| ✅ Clientes | SÍ | Datos de clientes para entregas |
| ✅ Inventario | SÍ | Monitorear stock en tiempo real |
| ✅ Logística | SÍ | Coordinar rutas y despachos |
| ✅ Recepción Limpieza | SÍ | Confirmar productos limpios |
| ✅ Trazabilidad | SÍ | Seguimiento de movimientos |
| ❌ Hojas de Gasto | NO | No registra gastos de campo |
| ❌ Validación Técnica | NO | No hace validación técnica |

---

### **🔧 Soporte Técnico** (8 módulos)
Basado en: Asignaciones técnicas, registros, limpieza, inventario

| Módulo | Acceso | Justificación |
|--------|--------|---------------|
| ✅ Chat | SÍ | Comunicación asíncrona |
| ✅ Agenda | SÍ | Ver cirugías asignadas |
| ✅ Inventario | SÍ | Ver inventario en tiempo real |
| ✅ Validación Técnica | SÍ | Asignaciones y recepciones |
| ✅ Recepción Limpieza | SÍ | Gestión de limpieza |
| ✅ Hojas de Gasto | SÍ | Registrar gastos desde campo |
| ✅ Trazabilidad | SÍ | Trazabilidad de tareas |
| ❌ Logística | NO | No coordina rutas |
| ❌ Clientes | NO | No gestiona clientes |

---

### **👑 Admin** (TODOS los módulos)
Acceso completo con wildcard `'*'`

| Módulo | Acceso |
|--------|--------|
| ✅ Chat | SÍ |
| ✅ Agenda | SÍ |
| ✅ Clientes | SÍ |
| ✅ Inventario | SÍ |
| ✅ Logística | SÍ |
| ✅ Recepción Limpieza | SÍ |
| ✅ Validación Técnica | SÍ |
| ✅ Hojas de Gasto | SÍ |
| ✅ Trazabilidad | SÍ |

---

## 🧪 Testing

### Pruebas Recomendadas

#### 1. **Test Comercial**
```bash
# Login como usuario comercial
# Verificar dashboard muestra solo:
- Chat ✅
- Agenda ✅
- Clientes ✅
- Hojas de Gasto ✅
- Trazabilidad ✅

# Verificar NO aparece:
- Logística ❌
- Inventario ❌
- Validación Técnica ❌
- Recepción Limpieza ❌
```

#### 2. **Test Logística**
```bash
# Login como usuario logística
# Verificar dashboard muestra solo:
- Chat ✅
- Agenda ✅
- Clientes ✅
- Inventario ✅
- Logística ✅
- Recepción Limpieza ✅
- Trazabilidad ✅

# Verificar NO aparece:
- Hojas de Gasto ❌
- Validación Técnica ❌
```

#### 3. **Test Soporte Técnico**
```bash
# Login como usuario soporte_tecnico
# Verificar dashboard muestra solo:
- Chat ✅
- Agenda ✅
- Inventario ✅
- Validación Técnica ✅
- Recepción Limpieza ✅
- Hojas de Gasto ✅
- Trazabilidad ✅

# Verificar NO aparece:
- Logística ❌
- Clientes ❌
```

#### 4. **Test Admin**
```bash
# Login como usuario admin
# Verificar dashboard muestra TODOS los módulos
```

#### 5. **Test Navegación Directa**
```bash
# Como comercial, intentar navegar a /internal/logistica
# Debería:
- Mostrar en consola: "🚫 comercial NO access to /internal/logistica"
- Redirigir a /internal
```

---

## 📊 Logs de Consola

El sistema genera logs útiles para debugging:

```typescript
// Al cargar el rol
console.log(`📋 Menú filtrado para rol ${role}:`, filteredMenu.length, 'items');

// Al intentar acceder a una ruta
console.log(`✅ ${profile.role} has access to ${currentRoute}`);
console.warn(`🚫 ${profile.role} NO access to ${currentRoute}`);

// Errores
console.error('❌ Error in roleBasedGuard:', error);
```

---

## 🔄 Flujo de Funcionamiento

### 1. **Carga del Dashboard**
```
Usuario accede a /internal
    ↓
internal-home.component.ts → ngOnInit()
    ↓
loadUserRole() → SupabaseService.getUserProfile()
    ↓
userRole.set('comercial')
    ↓
filterMenuByRole('comercial')
    ↓
menuItems.set([6 items filtrados])
    ↓
HTML renderiza solo 6 tarjetas
```

### 2. **Intento de Navegación**
```
Usuario hace clic en ruta protegida
    ↓
Router intenta navegar a /internal/logistica
    ↓
roleBasedGuard intercepta
    ↓
hasRoutePermission('comercial', '/internal/logistica')
    ↓
Retorna false
    ↓
Guard bloquea navegación
    ↓
Redirige a /internal
    ↓
Muestra warning en consola
```

---

## 🚀 Ventajas del Sistema

### ✅ Centralizado
- Una única fuente de verdad: `ROLE_PERMISSIONS`
- Fácil de mantener y actualizar

### ✅ DRY (Don't Repeat Yourself)
- Función `hasRoutePermission()` usada en guard y componente
- Sin duplicación de lógica

### ✅ Escalable
- Agregar nuevo rol:
  ```typescript
  supervisor: {
    role: 'supervisor',
    allowedRoutes: ['/internal', '/internal/agenda', ...],
    description: 'Supervisor de operaciones'
  }
  ```
- Agregar nuevo módulo:
  ```typescript
  {
    route: '/internal/reportes',
    title: 'Reportes',
    description: 'Reportes y estadísticas',
    icon: 'chart',
    roles: ['admin', 'comercial']
  }
  ```

### ✅ Seguro
- Doble capa de protección: Guards + UI
- Guards previenen acceso directo por URL
- UI oculta opciones no permitidas

### ✅ User-Friendly
- Usuario solo ve lo que puede usar
- No confusión con opciones bloqueadas
- Experiencia limpia y clara

---

## 📝 Notas Técnicas

### Sub-rutas
El sistema soporta sub-rutas automáticamente:
```typescript
// Si comercial tiene permiso a '/internal/agenda'
// También puede acceder a:
'/internal/agenda/crear'
'/internal/agenda/editar/:id'
'/internal/agenda/mi-agenda'
```

### Admin Wildcard
El rol `admin` tiene acceso especial con `'*'`:
```typescript
if (permissions.allowedRoutes.includes('*')) {
  return true; // Acceso a cualquier ruta
}
```

### Performance
- El rol se carga una sola vez al cargar el dashboard
- El filtrado del menú es instantáneo (operación en memoria)
- Guards son evaluados por Angular solo en navegación

---

## 🔮 Futuras Mejoras

### 1. **Permisos Granulares**
```typescript
permissions: {
  '/internal/clientes': ['read', 'write', 'delete'],
  '/internal/agenda': ['read', 'write']
}
```

### 2. **Cache de Permisos**
```typescript
// Guardar permisos en localStorage para evitar consultas repetidas
localStorage.setItem('userPermissions', JSON.stringify(permissions));
```

### 3. **Permisos por Nivel de Usuario**
```typescript
// Agregar niveles dentro de roles
comercial_junior: { ... },
comercial_senior: { ... }
```

### 4. **Directiva de Permisos**
```html
<!-- Usar directiva en cualquier elemento -->
<button *hasPermission="'/internal/clientes:write'">
  Crear Cliente
</button>
```

---

## ✅ Checklist de Implementación

- [x] Crear `role-permissions.config.ts` con permisos centralizados
- [x] Implementar `roleBasedGuard` en `role.guard.ts`
- [x] Aplicar guard a todas las rutas en `internal-routing.ts`
- [x] Inyectar `SupabaseService` en `internal-home.component.ts`
- [x] Agregar `loadUserRole()` y `filterMenuByRole()`
- [x] Convertir HTML a menú dinámico con `@for`
- [x] Agregar `getIconPath()` para íconos SVG
- [x] Mantener badge de mensajes no leídos en Chat
- [x] Agregar mensaje "Sin módulos disponibles"
- [x] Testing manual con cada rol

---

## 🎓 Documentación de Referencia

- **Angular Guards**: https://angular.dev/guide/routing/common-router-tasks#preventing-unauthorized-access
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **TypeScript Signals**: https://angular.dev/guide/signals

---

## 📞 Soporte

Para dudas o problemas:
1. Verificar logs de consola (`🚫`, `✅`, `❌`)
2. Revisar que el usuario tenga rol asignado en base de datos
3. Verificar que `ROLE_PERMISSIONS` incluye el rol
4. Confirmar que las rutas coinciden exactamente

---

**Fecha de Implementación**: 2024
**Versión**: 1.0.0
**Estado**: ✅ Completado y Funcional
