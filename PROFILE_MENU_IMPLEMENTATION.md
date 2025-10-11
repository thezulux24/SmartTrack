# Menú de Perfil - Implementación Completa

## 📋 Resumen

Se ha implementado un **menú de perfil lateral (sidebar drawer)** con estilo Implameq que se abre desde la derecha. Incluye un **avatar circular con inicial del nombre** del usuario, información del perfil y opciones de configuración.

---

## ✨ Características Implementadas

### 🎨 Diseño Visual
- ✅ **Avatar circular** con gradiente Implameq (C8D900 + 0098A8)
- ✅ **Inicial del nombre** del usuario en mayúscula
- ✅ **Indicador activo** (punto verde cuando menú está abierto)
- ✅ **Animaciones suaves** de entrada/salida (slide + fade)
- ✅ **Overlay con blur** para focalizar atención
- ✅ **Header con gradiente** (10284C → 0098A8)
- ✅ **Card flotante** con información del usuario
- ✅ **Badge de rol** con punto de color

### 📱 Funcionalidad
- ✅ Click en avatar → Abre menú lateral
- ✅ Click en overlay → Cierra menú
- ✅ Click en X → Cierra menú
- ✅ Información del usuario: Nombre, Email, Rol
- ✅ Opciones del menú con iconos
- ✅ Botón "Cerrar Sesión" con diseño destacado
- ✅ Navegación a diferentes secciones
- ✅ Responsive y adaptable

---

## 🗂️ Archivos Creados/Modificados

### 1. **profile-menu.component.ts** (NUEVO)
**Ubicación**: `src/app/shared/components/profile-menu.component.ts`

**Propósito**: Componente standalone del menú de perfil

**Estructura**:
```typescript
@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule],
  template: `...`,
  animations: [slideIn, fadeIn]
})
export class ProfileMenuComponent implements OnInit {
  isMenuOpen = signal(false);
  userProfile = signal<UserProfile | null>(null);
  
  // Métodos
  ngOnInit() → loadUserProfile()
  toggleMenu() → abre/cierra menú
  closeMenu() → cierra menú
  getInitial() → extrae inicial del nombre
  getRoleDisplay() → formatea rol a español
  navigateTo(route) → navega y cierra menú
  logout() → cierra sesión
}
```

**Servicios Inyectados**:
- `SupabaseService`: Para obtener perfil del usuario
- `AuthService`: Para cerrar sesión
- `Router`: Para navegación

**Signals Usados**:
- `isMenuOpen`: Estado del menú (abierto/cerrado)
- `userProfile`: Información del usuario (nombre, email, rol)

---

### 2. **internal-home.component.ts** (ACTUALIZADO)
**Cambios**:
- ✅ Importado `ProfileMenuComponent`
- ✅ Agregado a `imports` del componente
- ❌ Eliminado método `logout()` (ahora está en ProfileMenuComponent)

**Código Agregado**:
```typescript
import { ProfileMenuComponent } from '../../../shared/components/profile-menu.component';

@Component({
  imports: [
    CommonModule, 
    RouterModule, 
    NotificationPanelComponent, 
    NotificationToastComponent, 
    ProfileMenuComponent  // ← NUEVO
  ]
})
```

---

### 3. **internal-home.component.html** (ACTUALIZADO)
**Cambios**:
- ❌ Eliminado botón "Salir"
- ✅ Agregado `<app-profile-menu />`

**Código Antes**:
```html
<button (click)="logout()"
  class="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md">
  Salir
</button>
```

**Código Después**:
```html
<div class="flex items-center gap-3">
  <!-- Panel de notificaciones -->
  <app-notification-panel />
  
  <!-- Menú de perfil (reemplaza botón Salir) -->
  <app-profile-menu />
</div>
```

---

## 🎨 Elementos del Menú

### 🔵 Avatar Button (Header)
- **Ubicación**: Top-right del header
- **Tamaño**: 40x40px
- **Gradiente**: C8D900 → 0098A8
- **Contenido**: Inicial del nombre (letra mayúscula)
- **Ring**: Blanco con opacidad 30%
- **Hover**: Scale 105% (efecto zoom suave)
- **Indicador**: Punto verde cuando menú abierto

### 📋 Sidebar Menu
**Ancho**: 320px (w-80)
**Posición**: Fixed right-0
**Animación**: Slide from right (translateX)
**Z-index**: 50 (por encima de overlay)

**Secciones del Menú**:

#### 1️⃣ Header con Gradiente
- Gradiente: 10284C → 0098A8
- Avatar grande (80x80px) con inicial
- Botón cerrar (X) en esquina superior derecha

#### 2️⃣ Card de Información
- Tarjeta flotante sobre gradiente (-mt-12)
- Nombre completo del usuario
- Email
- Badge de rol con punto de color

#### 3️⃣ Opciones del Menú
**Mi Perfil**:
- Ícono: Usuario
- Gradiente: 0098A8
- Acción: Navegar a `/internal/perfil`

**Configuración**:
- Ícono: Engranaje
- Gradiente: C8D900
- Acción: Navegar a `/internal/configuracion`

**Notificaciones**:
- Ícono: Campana
- Gradiente: 10284C
- Acción: Navegar a `/internal/notificaciones`

**Ayuda y Soporte**:
- Ícono: Signo de interrogación
- Fondo: Gris claro
- Acción: Navegar a `/internal/ayuda`

#### 4️⃣ Footer (Cerrar Sesión)
- Fondo: Gradiente rojo (red-500 → red-600)
- Ícono: Puerta con flecha
- Texto: "Cerrar Sesión"
- Efecto hover: Scale 102% + sombra más intensa
- Acción: Cierra sesión y redirige a login

---

## 🎭 Animaciones

### SlideIn (Sidebar)
```typescript
trigger('slideIn', [
  state('closed', style({
    transform: 'translateX(100%)',  // Fuera de pantalla (derecha)
    opacity: 0
  })),
  state('open', style({
    transform: 'translateX(0)',     // Posición normal
    opacity: 1
  })),
  transition('closed => open', [
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')  // Ease-out
  ]),
  transition('open => closed', [
    animate('250ms cubic-bezier(0.4, 0, 0.2, 1)')  // Más rápido
  ])
])
```

### FadeIn (Overlay)
```typescript
trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('150ms', style({ opacity: 0 }))
  ])
])
```

---

## 🔐 Lógica de Usuario

### Carga de Perfil
```typescript
async loadUserProfile() {
  const session = await this.supabaseService.getSession();
  if (session?.user?.id) {
    const profile = await this.supabaseService.getUserProfile(session.user.id);
    if (profile) {
      this.userProfile.set({
        full_name: profile.full_name || 'Usuario',
        email: session.user.email || 'Sin email',
        role: profile.role || 'Sin rol'
      });
    }
  }
}
```

### Extracción de Inicial
```typescript
getInitial(): string {
  const name = this.userProfile()?.full_name || 'U';
  return name.charAt(0).toUpperCase();
}
```

### Mapeo de Roles
```typescript
getRoleDisplay(): string {
  const roleMap: Record<string, string> = {
    'admin': 'Administrador',
    'comercial': 'Comercial',
    'logistica': 'Logística',
    'soporte_tecnico': 'Soporte Técnico',
    'client': 'Cliente'
  };
  return roleMap[role] || role;
}
```

---

## 🎯 Flujos de Interacción

### 1. Abrir Menú
```
Usuario hace click en avatar
    ↓
toggleMenu() → isMenuOpen.set(true)
    ↓
Animación slideIn: closed → open (300ms)
    ↓
Overlay aparece con fadeIn (200ms)
    ↓
Menú visible desde la derecha
```

### 2. Cerrar Menú (3 formas)
**a) Click en Overlay**:
```
Usuario hace click fuera del menú
    ↓
(click)="closeMenu()" en overlay
    ↓
isMenuOpen.set(false)
    ↓
Animación slideIn: open → closed (250ms)
    ↓
Overlay desaparece con fadeOut (150ms)
```

**b) Click en X**:
```
Usuario hace click en botón cerrar
    ↓
(click)="closeMenu()" en botón
    ↓
[mismo flujo que overlay]
```

**c) Navegación**:
```
Usuario selecciona opción del menú
    ↓
navigateTo('/ruta')
    ↓
closeMenu() primero
    ↓
router.navigate([route]) después
```

### 3. Cerrar Sesión
```
Usuario hace click en "Cerrar Sesión"
    ↓
logout() → closeMenu()
    ↓
authService.logOut()
    ↓
router.navigate(['/auth/log-in'])
    ↓
Usuario regresa a login
```

---

## 🎨 Paleta de Colores Implameq

### Colores Principales
- **Azul Oscuro**: `#10284C` (texto, fondos)
- **Azul Claro**: `#0098A8` (gradientes, acentos)
- **Verde Lima**: `#C8D900` (botones, highlights)

### Gradientes Usados
1. **Avatar**: `from-[#C8D900] to-[#0098A8]`
2. **Header**: `from-[#10284C] via-[#0098A8] to-[#0098A8]`
3. **Botones**: Específicos por opción (ver sección Opciones del Menú)
4. **Badge de Rol**: `from-[#0098A8]/10 to-[#C8D900]/10`

### Colores Secundarios
- **Rojo Logout**: `red-500` → `red-600`
- **Gris**: `gray-50`, `gray-100`, `gray-600` (fondos, textos secundarios)
- **Blanco**: Anillos, textos, overlay con opacidad

---

## 📐 Espaciado y Tamaños

### Avatar
- **Pequeño (header)**: 40x40px (w-10 h-10)
- **Grande (menú)**: 80x80px (w-20 h-20)
- **Ring**: 2px blanco 30% opacidad

### Sidebar
- **Ancho**: 320px (w-80)
- **Padding**: 16px (p-4)
- **Gap entre items**: 8px (space-y-2)

### Íconos
- **Menú principal**: 20x20px (w-5 h-5)
- **Avatar**: 24x24px (w-6 h-6)
- **Contenedores**: 40x40px (w-10 h-10)

### Bordes
- **Radius Avatar**: `rounded-full`
- **Radius Card**: `rounded-2xl`
- **Radius Botones**: `rounded-xl`, `rounded-lg`

---

## 🔍 Detalles Técnicos

### Overlay
```html
<div 
  [@fadeIn]
  (click)="closeMenu()"
  class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40">
</div>
```
- **Posición**: Fixed full screen
- **Fondo**: Negro 50% opacidad
- **Blur**: Desenfoque del contenido detrás
- **Z-index**: 40 (debajo del sidebar)
- **Click**: Cierra el menú

### Sidebar
```html
<div 
  [@slideIn]="isMenuOpen() ? 'open' : 'closed'"
  class="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
```
- **Posición**: Fixed right-0
- **Altura**: 100% viewport
- **Z-index**: 50 (encima de overlay)
- **Layout**: Flexbox columna (permite footer fijo)

### Card Flotante
```html
<div class="bg-white -mt-12 mx-4 rounded-2xl shadow-lg p-6 relative z-10 border border-gray-100">
```
- **Margin Top**: -48px (sale del gradiente)
- **Z-index**: 10 (encima del gradiente)
- **Sombra**: lg (shadow-lg)
- **Border**: Gris muy claro

---

## 🚀 Ventajas de la Implementación

### ✅ Standalone Component
- No necesita NgModule
- Fácil de importar en cualquier componente
- Encapsulación total

### ✅ Signals
- Reactividad automática
- Performance optimizado
- Código más limpio

### ✅ Animaciones Angular
- Suaves y nativas
- Control total de timing
- Compatible con navegadores modernos

### ✅ Responsive
- Funciona en diferentes tamaños de pantalla
- Overlay se adapta automáticamente
- Sidebar con ancho fijo optimizado para móvil

### ✅ Accesibilidad
- Click fuera cierra el menú (UX estándar)
- Botón cerrar visible
- Transiciones suaves (reduce motion sickness)

---

## 🧪 Testing Manual

### Test 1: Apertura del Menú
```bash
1. Ir a /internal
2. Hacer click en avatar circular (top-right)
3. Verificar:
   - ✅ Menú se desliza desde la derecha (300ms)
   - ✅ Overlay aparece con blur
   - ✅ Indicador verde en avatar
   - ✅ Información del usuario visible
```

### Test 2: Cierre del Menú
```bash
# Opción A: Click en overlay
1. Menú abierto
2. Click fuera del menú (overlay)
3. Verificar menú se cierra (250ms)

# Opción B: Click en X
1. Menú abierto
2. Click en X (top-right del sidebar)
3. Verificar menú se cierra

# Opción C: Navegación
1. Menú abierto
2. Click en "Mi Perfil"
3. Verificar menú se cierra + navegación
```

### Test 3: Información del Usuario
```bash
1. Abrir menú
2. Verificar datos:
   - ✅ Inicial correcta en avatar
   - ✅ Nombre completo visible
   - ✅ Email correcto
   - ✅ Rol traducido a español
   - ✅ Badge de rol con punto de color
```

### Test 4: Opciones del Menú
```bash
Para cada opción (Perfil, Config, Notif, Ayuda):
1. Click en opción
2. Verificar:
   - ✅ Menú se cierra
   - ✅ Navega a ruta correcta
   - ✅ Hover funciona (bg-gray-50)
```

### Test 5: Cerrar Sesión
```bash
1. Menú abierto
2. Scroll al footer
3. Click en "Cerrar Sesión"
4. Verificar:
   - ✅ Menú se cierra
   - ✅ Sesión cerrada
   - ✅ Redirige a /auth/log-in
   - ✅ No puede volver atrás
```

### Test 6: Animaciones
```bash
1. Abrir menú varias veces consecutivas
2. Verificar:
   - ✅ Animación suave sin jank
   - ✅ No se corta a mitad
   - ✅ Overlay sincronizado con sidebar
```

---

## 🔮 Mejoras Futuras

### 1. Foto de Perfil Real
```typescript
// Agregar campo avatar_url en base de datos
// Mostrar imagen si existe, si no mostrar inicial
<img *ngIf="userProfile()?.avatar_url" 
     [src]="userProfile()?.avatar_url" />
<span *ngIf="!userProfile()?.avatar_url">
  {{ getInitial() }}
</span>
```

### 2. Upload de Foto
```typescript
// Opción en menú para subir foto
// Integrar con Supabase Storage
uploadAvatar(file: File) {
  await supabase.storage
    .from('avatars')
    .upload(`${userId}`, file);
}
```

### 3. Edición Inline
```typescript
// Editar nombre/email directamente desde el menú
<input [(ngModel)]="tempName" />
<button (click)="updateProfile()">Guardar</button>
```

### 4. Tema Oscuro
```typescript
// Toggle de tema en configuración
isDarkMode = signal(false);
// Aplicar clases condicionales
[class.dark]="isDarkMode()"
```

### 5. Estadísticas
```typescript
// Mostrar stats en el header del menú
<div>Cirugías: {{ stats.cirugias }}</div>
<div>Tareas: {{ stats.tareas }}</div>
```

### 6. Notificaciones en Menú
```typescript
// Badge en opción "Notificaciones"
<span class="badge">{{ unreadCount() }}</span>
```

---

## 📚 Referencias

- **Angular Animations**: https://angular.dev/guide/animations
- **Signals**: https://angular.dev/guide/signals
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth

---

## ✅ Checklist de Implementación

- [x] Crear `profile-menu.component.ts`
- [x] Diseñar avatar circular con inicial
- [x] Implementar animaciones (slideIn + fadeIn)
- [x] Agregar overlay con blur
- [x] Diseñar sidebar con header gradient
- [x] Crear card de información flotante
- [x] Agregar opciones del menú (4 items)
- [x] Implementar botón "Cerrar Sesión"
- [x] Integrar con SupabaseService
- [x] Cargar información del usuario
- [x] Mapear roles a español
- [x] Importar en `internal-home.component.ts`
- [x] Reemplazar botón "Salir" en HTML
- [x] Eliminar método `logout()` del home
- [x] Testing manual completo
- [x] Verificar sin errores de compilación

---

**Fecha de Implementación**: Octubre 11, 2025
**Versión**: 1.0.0
**Estado**: ✅ Completado y Funcional
