/**
 * Configuración de permisos por rol basado en los Jobs específicos de cada usuario
 */

export interface RolePermissions {
  role: string;
  allowedRoutes: string[];
  description: string;
}

/**
 * MAPA DE PERMISOS POR ROL
 * Basado en los Jobs principales y específicos de cada usuario
 */
export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  /**
   * ADMIN - Acceso completo a todo el sistema
   */
  admin: {
    role: 'admin',
    allowedRoutes: ['*'], // Acceso a todo
    description: 'Acceso administrativo completo'
  },

  /**
   * COMERCIAL - Gestión del ciclo comercial
   * Jobs: Programar cirugías, gestionar agenda, hojas de gasto, coordinación, reportes, alertas
   */
  comercial: {
    role: 'comercial',
    allowedRoutes: [
      '/internal',
      '/internal/agenda',           // ✅ Job 1-2: Programar y visualizar agenda
      '/internal/agenda/crear',
      '/internal/agenda/editar',
      '/internal/clientes',          // ✅ Gestión de clientes
      '/internal/hojas-gasto',       // ✅ Job 3: Gestionar hojas de gasto
      '/internal/chat',              // ✅ Job 4: Coordinar con logística y soporte
      '/internal/trazabilidad',      // ✅ Job 1: Dar trazabilidad al ciclo
      // NO tiene acceso a:
      // - inventario (es de logística)
      // - logistica (módulo específico)
      // - tecnico (módulo específico)
      // - limpieza (es de soporte técnico)
    ],
    description: 'Gestión comercial, agenda y coordinación'
  },

  /**
   * LOGÍSTICA - Control de insumos y entregas
   * Jobs: Inventarios, rutas, movimientos, coordinación, panel control, alertas
   */
  logistica: {
    role: 'logistica',
    allowedRoutes: [
      '/internal',
      '/internal/inventario',        // ✅ Job 1: Monitorear inventarios en tiempo real
      '/internal/logistica',         // ✅ Job 2-3: Rutas, despachos, bitácora digital
      '/internal/agenda',            // ✅ Job 4: Ver solicitudes quirúrgicas
      '/internal/chat',              // ✅ Job 4: Coordinación con comercial y soporte
      '/internal/trazabilidad',      // ✅ Job 3: Trazabilidad de movimientos
      '/internal/clientes',          // ✅ Ver datos de clientes para entregas
      // NO tiene acceso a:
      // - hojas-gasto (es de comercial/técnico)
      // - tecnico (módulo específico)
      // - limpieza (es de soporte técnico)
    ],
    description: 'Gestión de inventarios, logística y entregas'
  },

  /**
   * SOPORTE TÉCNICO - Soporte en quirófano
   * Jobs: Asignaciones, registros, tiempos, inventario, reportes, comunicación, KPIs
   */
  soporte_tecnico: {
    role: 'soporte_tecnico',
    allowedRoutes: [
      '/internal',
      '/internal/tecnico',           // ✅ Job 1: Asignaciones de soporte
      '/internal/agenda',            // ✅ Job 1: Ver agenda de cirugías asignadas
      '/internal/hojas-gasto',       // ✅ Job 2: Registrar hojas de gasto desde campo
      '/internal/inventario',        // ✅ Job 4: Ver inventario en tiempo real
      '/internal/limpieza',          // ✅ Gestión de limpieza y esterilización
      '/internal/chat',              // ✅ Job 6: Comunicación asincrónica
      '/internal/trazabilidad',      // ✅ Job 1-3: Trazabilidad de tareas y tiempos
      // NO tiene acceso a:
      // - logistica (módulo específico de logística)
      // - clientes (no necesita gestión comercial)
    ],
    description: 'Soporte técnico, registros y limpieza'
  },

  /**
   * CLIENTE - Portal limitado para clientes externos
   */
  client: {
    role: 'client',
    allowedRoutes: [
      '/client',
      '/client/mis-cirugias',
      '/client/validar-qr'
    ],
    description: 'Portal de cliente'
  }
};

/**
 * Verifica si un rol tiene permiso para acceder a una ruta
 */
export function hasRoutePermission(role: string, route: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return false;
  }

  // Admin tiene acceso a todo
  if (permissions.allowedRoutes.includes('*')) {
    return true;
  }

  // Verificar si la ruta está en las rutas permitidas
  return permissions.allowedRoutes.some(allowedRoute => {
    // Coincidencia exacta
    if (route === allowedRoute) {
      return true;
    }
    
    // Verificar si es una sub-ruta permitida
    // Ej: /internal/agenda/crear está permitido si /internal/agenda está permitido
    if (route.startsWith(allowedRoute + '/')) {
      return true;
    }
    
    return false;
  });
}

/**
 * Obtiene las rutas permitidas para un rol
 */
export function getAllowedRoutes(role: string): string[] {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.allowedRoutes : [];
}

/**
 * Obtiene la descripción del rol
 */
export function getRoleDescription(role: string): string {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.description : 'Rol desconocido';
}
