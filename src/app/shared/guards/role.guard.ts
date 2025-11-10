import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { SupabaseService } from '../data-access/supabase.service';
import { hasRoutePermission } from './role-permissions.config';

export const clientGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      router.navigate(['/auth']);
      return false;
    }

    const profile = await supabase.getUserProfile(uid);
    
    if (!profile) {
      router.navigate(['/']);
      return false;
    }

    // Solo permite acceso a clientes
    if (profile.role === 'client') {
      return true;
    }

    // Si no es cliente, redirige al dashboard interno
    router.navigate(['/internal']);
    return false;
  } catch (error) {
    console.error('Error en clientGuard:', error);
    router.navigate(['/auth']);
    return false;
  }
};

export const internalGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      router.navigate(['/auth']);
      return false;
    }

    const profile = await supabase.getUserProfile(uid);
    
    if (!profile) {
      router.navigate(['/']);
      return false;
    }

    // Solo permite acceso a usuarios internos
    const internalRoles = ['comercial', 'soporte_tecnico', 'logistica', 'admin'];
    if (internalRoles.includes(profile.role)) {
      return true;
    }

    // Si es cliente, redirige al portal cliente
    router.navigate(['/client']);
    return false;
  } catch (error) {
    console.error('Error en internalGuard:', error);
    router.navigate(['/auth']);
    return false;
  }
};

/**
 * Guard genérico que verifica permisos basado en la configuración de roles
 * Usa el sistema RBAC definido en role-permissions.config.ts
 */
export const roleBasedGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      console.warn('🔒 roleBasedGuard: No hay sesión, redirigiendo a /auth');
      router.navigate(['/auth']);
      return false;
    }

    const profile = await supabase.getUserProfile(uid);
    
    if (!profile) {
      console.warn('🔒 roleBasedGuard: No se encontró perfil');
      router.navigate(['/']);
      return false;
    }

    const currentRoute = state.url;
    const hasPermission = hasRoutePermission(profile.role, currentRoute);

    if (hasPermission) {
      return true;
    }

    console.warn(`🚫 roleBasedGuard: ${profile.role} NO tiene acceso a ${currentRoute}`);
    router.navigate(['/internal']);
    return false;

  } catch (error) {
    console.error('❌ Error en roleBasedGuard:', error);
    router.navigate(['/internal']);
    return false;
  }
};

// Guards específicos para cada área (con admin siempre permitido)
export const comercialGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      router.navigate(['/auth']);
      return false;
    }

    const profile = await supabase.getUserProfile(uid);
    
    if (profile?.role === 'comercial' || profile?.role === 'admin') {
      return true;
    }

    router.navigate(['/internal']);
    return false;
  } catch (error) {
    console.error('Error en comercialGuard:', error);
    router.navigate(['/internal']);
    return false;
  }
};

export const soporteGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      router.navigate(['/auth']);
      return false;
    }

    const profile = await supabase.getUserProfile(uid);
    
    if (profile?.role === 'soporte_tecnico' || profile?.role === 'admin') {
      return true;
    }

    router.navigate(['/internal']);
    return false;
  } catch (error) {
    console.error('Error en soporteGuard:', error);
    router.navigate(['/internal']);
    return false;
  }
};

export const logisticaGuard: CanActivateFn = async (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    const uid = session?.user?.id;
    
    if (!uid) {
      router.navigate(['/auth']);
      return false;
    }

    const profile = await supabase.getUserProfile(uid);
    
    if (profile?.role === 'logistica' || profile?.role === 'admin') {
      return true;
    }

    router.navigate(['/internal']);
    return false;
  } catch (error) {
    console.error('Error en logisticaGuard:', error);
    router.navigate(['/internal']);
    return false;
  }
};