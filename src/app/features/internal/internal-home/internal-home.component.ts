import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 

import { Router } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';
import { ChatService } from '../../../shared/services/chat.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { NotificationPanelComponent } from '../../../shared/components/notification-panel.component';
import { NotificationToastComponent } from '../../../shared/components/notification-toast.component';
import { ProfileMenuComponent } from '../../../shared/components/profile-menu.component';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { hasRoutePermission } from '../../../shared/guards/role-permissions.config';

interface MenuItem {
  route: string;
  title: string;
  description: string;
  icon: string;
  roles: string[]; // Roles que pueden ver este item
}

@Component({
  selector: 'app-internal-home',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationPanelComponent, NotificationToastComponent, ProfileMenuComponent],
  templateUrl: './internal-home.component.html',
  styleUrl: './internal-home.component.css'
})
export default class InternalHomeComponent implements OnInit {

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _chatService = inject(ChatService);
  private _supabaseService = inject(SupabaseService);
  notificationService = inject(NotificationService);

  totalUnreadMessages = signal(0);
  userRole = signal<string>('');
  menuItems = signal<MenuItem[]>([]);
  
  // KPIs
  cirugiasHoy = signal(0);
  stockCritico = signal(0);
  kitsEnProceso = signal(0);
  cotizacionesPendientes = signal(0);

  // Definición completa del menú con permisos
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
      roles: ['admin', 'comercial', 'logistica']  // ✅ Agenda general solo para comercial y logística
    },
    {
      route: '/internal/agenda/mi-agenda',
      title: 'Mi Agenda',
      description: 'Mis cirugías asignadas',
      icon: 'calendar',
      roles: ['soporte_tecnico']  // ✅ Técnicos ven solo su agenda personal
    },
    {
      route: '/internal/clientes',
      title: 'Clientes',
      description: 'Gestión de clientes',
      icon: 'users',
      roles: ['admin', 'comercial', 'logistica']
    },
    {
      route: '/internal/comercial',
      title: 'Dashboard Comercial',
      description: 'Métricas y análisis',
      icon: 'chart',
      roles: ['admin', 'comercial']
    },
    {
      route: '/internal/cotizaciones',
      title: 'Cotizaciones',
      description: 'Propuestas comerciales',
      icon: 'currency',
      roles: ['admin', 'comercial']
    },
    {
      route: '/internal/logistica',
      title: 'Logística',
      description: 'Gestión de kits',
      icon: 'clipboard',
      roles: ['admin', 'logistica']
    },
    {
      route: '/internal/inventario',
      title: 'Inventario',
      description: 'Control de stock',
      icon: 'cube',
      roles: ['admin', 'logistica', 'soporte_tecnico']
    },
    {
      route: '/internal/tecnico',
      title: 'Validación Técnica',
      description: 'Recepción de kits',
      icon: 'check-circle',
      roles: ['admin', 'soporte_tecnico']
    },
    {
      route: '/internal/limpieza',
      title: 'Lavado y Esterilización',
      description: 'Gestión de limpieza de material',
      icon: 'check',
      roles: ['admin', 'logistica']
    },
    {
      route: '/internal/hojas-gasto',
      title: 'Hojas de Gasto',
      description: 'Registro de gastos',
      icon: 'document',
      roles: ['admin', 'comercial', 'logistica', 'soporte_tecnico']
    },
    {
      route: '/internal/trazabilidad',
      title: 'Trazabilidad',
      description: 'Seguimiento completo',
      icon: 'clock',
      roles: ['admin', 'comercial', 'logistica', 'soporte_tecnico']
    }
  ];

  async ngOnInit() {
    await this.loadUserRole();
    await this.loadUnreadMessagesCount();
    await this.initializeNotifications();
    await this.loadKPIs();
    
    // Actualizar cada 30 segundos
    setInterval(() => {
      this.loadUnreadMessagesCount();
      this.loadKPIs();
    }, 30000);
  }

  async loadUserRole() {
    try {
      const session = await this._supabaseService.getSession();
      if (session?.user?.id) {
        const profile = await this._supabaseService.getUserProfile(session.user.id);
        if (profile) {
          this.userRole.set(profile.role);
          this.filterMenuByRole(profile.role);
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  }

  filterMenuByRole(role: string) {
    const filteredMenu = this.allMenuItems.filter(item => {
      // Verificar si el rol está en la lista de roles permitidos
      if (item.roles.includes(role)) {
        // También verificar con el sistema RBAC
        return hasRoutePermission(role, item.route);
      }
      return false;
    });
    
    this.menuItems.set(filteredMenu);

  }

  async initializeNotifications() {
    try {
      const { data } = await this._authService.session();
      if (data?.session?.user) {
        await this.notificationService.initialize(data.session.user.id);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async loadUnreadMessagesCount() {
    try {
      await this._chatService.actualizarUnreadCounts();
      this._chatService.unreadCounts$.subscribe(counts => {
        const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
        this.totalUnreadMessages.set(total);
      });
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  }

  async loadKPIs() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 1. Cirugías programadas para hoy
      const { count: cirugiasCount } = await this._supabaseService.client
        .from('cirugias')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_programada', today.toISOString())
        .lt('fecha_programada', tomorrow.toISOString())
        .in('estado', ['programada', 'confirmada', 'en_curso']);
      
      this.cirugiasHoy.set(cirugiasCount || 0);

      // 2. Productos con stock crítico (cantidad <= stock_minimo)
      const { data: stockData } = await this._supabaseService.client
        .from('inventario')
        .select('producto_id, cantidad, productos!inner(stock_minimo)')
        .eq('estado', 'disponible');
      
      const stockCriticoCount = stockData?.filter(item => {
        const stockMinimo = (item.productos as any)?.stock_minimo || 5;
        return item.cantidad <= stockMinimo;
      }).length || 0;
      
      this.stockCritico.set(stockCriticoCount);

      // 3. Kits en proceso (preparando, listo_envio, en_transito)
      const { count: kitsCount } = await this._supabaseService.client
        .from('kits_cirugia')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['preparando', 'listo_envio', 'en_transito']);
      
      this.kitsEnProceso.set(kitsCount || 0);

      // 4. Cotizaciones pendientes (borrador, enviada)
      const { count: cotizacionesCount } = await this._supabaseService.client
        .from('cotizaciones')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['borrador', 'enviada']);
      
      this.cotizacionesPendientes.set(cotizacionesCount || 0);

    } catch (error) {
      console.error('Error loading KPIs:', error);
    }
  }

  getIconPath(icon: string): string {
    const iconPaths: Record<string, string> = {
      'chat': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      'calendar': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      'users': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      'currency': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'chart': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      'clipboard': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      'cube': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      'check-circle': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'check': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'document': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'clock': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return iconPaths[icon] || iconPaths['check'];
  }

}