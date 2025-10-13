import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../data-access/supabase.service';
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationConfig,
  NotificationStats,
  NotificationData
} from '../models/notification.model';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  // Estado de notificaciones
  private notifications = signal<Notification[]>([]);
  private toasts = signal<Notification[]>([]);
  private channel: RealtimeChannel | null = null;
  private userId: string | null = null;

  // Configuración
  private config = signal<NotificationConfig>({
    showToast: true,
    playSound: true,
    vibrate: true,
    duration: 5000
  });

  // Computadas
  unreadCount = computed(() => 
    this.notifications().filter(n => !n.read).length
  );

  allNotifications = computed(() => 
    this.notifications().sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  );

  unreadNotifications = computed(() =>
    this.allNotifications().filter(n => !n.read)
  );

  activeToasts = computed(() => this.toasts());

  stats = computed<NotificationStats>(() => {
    const all = this.notifications();
    const stats: NotificationStats = {
      total: all.length,
      unread: all.filter(n => !n.read).length,
      by_type: {
        nuevo_mensaje: 0,
        cambio_estado_cirugia: 0,
        cambio_estado_kit: 0,
        alerta_stock: 0,
        alerta_vencimiento: 0,
        asignacion_cirugia: 0,
        cambio_agenda: 0,
        asignacion_mensajero: 0,
        cambio_estado_envio: 0,
        retraso_envio: 0,
        error_logistico: 0,
        solicitud_urgente: 0,
        cambio_estado_hoja_gasto: 0,
        aprobacion_pendiente: 0,
        incidente_cirugia: 0,
        cirugia_cancelada: 0,
        sistema: 0,
        cotizacion_aprobada: 0,
        cotizacion_rechazada: 0,
        cotizacion_proxima_vencer: 0,
        cotizacion_vencida: 0
      }
    };

    all.forEach(n => {
      if (stats.by_type[n.type] !== undefined) {
        stats.by_type[n.type]++;
      }
    });

    return stats;
  });

  constructor() {
    this.initializeService();
  }

  // ======================
  // INICIALIZACIÓN
  // ======================
  private async initializeService() {
    try {
      const session = await this.supabase.getSession();
      if (session?.user) {
        this.userId = session.user.id;
        console.log('🔔 Notification Service: Initializing for user', this.userId);
        await this.loadNotifications();
        this.subscribeToNotifications();
      }
    } catch (error) {
      console.error('❌ Error initializing notification service:', error);
    }
  }

  async initialize(userId: string) {
    this.userId = userId;
    console.log('🔔 Notification Service: Manual initialization for user', userId);
    await this.loadNotifications();
    this.subscribeToNotifications();
  }

  // ======================
  // CARGAR NOTIFICACIONES
  // ======================
  private async loadNotifications() {
    if (!this.userId) {
      console.warn('⚠️ NotificationService: No userId set, skipping load');
      return;
    }

    try {
      console.log('📥 NotificationService: Loading notifications for', this.userId);
      
      // Cargar últimas 50 notificaciones
      const { data, error } = await this.supabase.client
        .from('notificaciones')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ NotificationService: Error loading notifications:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ NotificationService: Loaded', data.length, 'notifications');
        this.notifications.set(data);
      } else {
        console.log('📭 NotificationService: No notifications found');
      }
    } catch (error) {
      console.error('❌ NotificationService: Exception loading notifications:', error);
    }
  }

  // ======================
  // SUSCRIPCIÓN REALTIME
  // ======================
  private subscribeToNotifications() {
    if (!this.userId) {
      console.warn('⚠️ NotificationService: No userId, skipping realtime subscription');
      return;
    }

    // Limpiar canal previo
    if (this.channel) {
      console.log('🔌 NotificationService: Removing previous channel');
      this.supabase.client.removeChannel(this.channel);
    }

    console.log('🔌 NotificationService: Creating realtime subscription for user:', this.userId);
    console.log('📡 Channel name:', `notifications:${this.userId}`);

    // Crear nuevo canal
    this.channel = this.supabase.client
      .channel(`notifications:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${this.userId}`
        },
        (payload) => {
          console.log('📬 NotificationService: ✨ REALTIME EVENT RECEIVED! ✨');
          console.log('📬 Payload:', payload);
          const notification = payload.new as Notification;
          this.handleNewNotification(notification);
        }
      )
      .subscribe((status, error) => {
        console.log('🔌 NotificationService: Subscription status:', status);
        if (error) {
          console.error('❌ NotificationService: Subscription error:', error);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ NotificationService: Successfully subscribed to realtime!');
          console.log('⏳ Waiting for new notifications...');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ NotificationService: Channel error - Realtime may not be enabled');
        }
        if (status === 'TIMED_OUT') {
          console.error('❌ NotificationService: Subscription timed out');
        }
      });
  }

  private handleNewNotification(notification: Notification) {
    console.log('🎉 NotificationService: Handling new notification', notification);
    
    // Agregar a la lista
    this.notifications.update(notifications => [notification, ...notifications]);
    console.log('✅ NotificationService: Added to notifications list. Total:', this.notifications().length);

    // Mostrar toast si está habilitado
    if (this.config().showToast) {
      console.log('🍞 NotificationService: Showing toast');
      this.showToast(notification);
    }

    // Reproducir sonido
    if (this.config().playSound) {
      console.log('🔊 NotificationService: Playing sound');
      this.playNotificationSound();
    }

    // Vibrar
    if (this.config().vibrate && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  }

  // ======================
  // CREAR NOTIFICACIONES
  // ======================
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'medium',
    data?: NotificationData,
    link?: string
  ): Promise<Notification | null> {
    console.log('🔨 NotificationService.createNotification called:', {
      userId,
      type,
      title,
      message,
      priority
    });

    try {
      const notification: Omit<Notification, 'id' | 'created_at'> = {
        user_id: userId,
        type,
        priority,
        title,
        message,
        icon: this.getIconForType(type),
        icon_color: this.getColorForPriority(priority),
        link,
        data: data || {},
        read: false
      };

      console.log('📝 NotificationService: Inserting notification:', notification);

      const { data: newNotification, error } = await this.supabase.client
        .from('notificaciones')
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.error('❌ NotificationService.createNotification: Supabase error:', error);
        throw error;
      }

      console.log('✅ NotificationService.createNotification: Success!', newNotification);
      return newNotification;
    } catch (error) {
      console.error('❌ NotificationService.createNotification: Exception:', error);
      return null;
    }
  }

  // Método helper para notificar a múltiples usuarios
  async notifyUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'medium',
    data?: NotificationData,
    link?: string
  ) {
    const promises = userIds.map(userId =>
      this.createNotification(userId, type, title, message, priority, data, link)
    );
    
    await Promise.allSettled(promises);
  }

  // ======================
  // NOTIFICACIONES ESPECÍFICAS
  // ======================

  // Nuevo mensaje en chat
  async notifyNewMessage(
    recipientIds: string[],
    cirugia_id: string,
    numero_cirugia: string,
    remitente_nombre: string,
    mensaje_preview: string
  ) {
    console.log('📨 NotificationService.notifyNewMessage called with:', {
      recipientIds,
      cirugia_id,
      numero_cirugia,
      remitente_nombre,
      mensaje_preview
    });

    try {
      await this.notifyUsers(
        recipientIds,
        'nuevo_mensaje',
        `Nuevo mensaje en ${numero_cirugia}`,
        `${remitente_nombre}: ${mensaje_preview.substring(0, 50)}${mensaje_preview.length > 50 ? '...' : ''}`,
        'medium',
        { cirugia_id, remitente_nombre },
        `/internal/chat/${cirugia_id}`
      );
      console.log('✅ NotificationService.notifyNewMessage: Notifications sent successfully');
    } catch (error) {
      console.error('❌ NotificationService.notifyNewMessage: Error:', error);
    }
  }

  // Cambio de estado de cirugía
  async notifyCirugiaStatusChange(
    userIds: string[],
    cirugia_id: string,
    numero_cirugia: string,
    estado_anterior: string,
    estado_nuevo: string
  ) {
    await this.notifyUsers(
      userIds,
      'cambio_estado_cirugia',
      `${numero_cirugia} cambió de estado`,
      `De "${estado_anterior}" a "${estado_nuevo}"`,
      'high',
      { cirugia_id, numero_cirugia, estado_anterior, estado_nuevo },
      `/internal/agenda`
    );
  }

  // Cambio de estado de kit
  async notifyKitStatusChange(
    userIds: string[],
    kit_id: string,
    numero_cirugia: string,
    estado_anterior: string,
    estado_nuevo: string
  ) {
    await this.notifyUsers(
      userIds,
      'cambio_estado_kit',
      `Kit de ${numero_cirugia} actualizado`,
      `Estado: ${estado_nuevo}`,
      'medium',
      { kit_id, numero_cirugia, estado_anterior, estado_nuevo },
      `/internal/logistica`
    );
  }

  // Alerta de stock bajo
  async notifyLowStock(
    userIds: string[],
    producto_id: string,
    producto_nombre: string,
    cantidad_actual: number,
    cantidad_minima: number
  ) {
    await this.notifyUsers(
      userIds,
      'alerta_stock',
      '⚠️ Stock bajo',
      `${producto_nombre}: ${cantidad_actual} unidades (mínimo: ${cantidad_minima})`,
      'high',
      { producto_id, producto_nombre, cantidad_actual, cantidad_minima },
      `/internal/inventario`
    );
  }

  // Alerta de vencimiento próximo
  async notifyExpiringProduct(
    userIds: string[],
    producto_id: string,
    producto_nombre: string,
    fecha_vencimiento: string,
    dias_restantes: number
  ) {
    await this.notifyUsers(
      userIds,
      'alerta_vencimiento',
      '⏰ Producto próximo a vencer',
      `${producto_nombre} vence en ${dias_restantes} días (${fecha_vencimiento})`,
      'urgent',
      { producto_id, producto_nombre, fecha_vencimiento },
      `/internal/inventario`
    );
  }

  // Nueva asignación de cirugía
  async notifyAssignedToSurgery(
    tecnico_id: string,
    cirugia_id: string,
    numero_cirugia: string,
    fecha_programada: string,
    hospital_nombre: string
  ) {
    await this.createNotification(
      tecnico_id,
      'asignacion_cirugia',
      '🏥 Nueva cirugía asignada',
      `${numero_cirugia} - ${hospital_nombre} el ${fecha_programada}`,
      'high',
      { cirugia_id, numero_cirugia, fecha_programada },
      `/internal/agenda`
    );
  }

  // Nueva cirugía creada (notifica a técnico asignado + logística)
  async notifyNewCirugia(
    tecnico_asignado_id: string | null,
    cirugia_id: string,
    numero_cirugia: string,
    medico_cirujano: string,
    fecha_programada: string,
    hospital_nombre: string,
    creador_nombre: string
  ) {
    console.log('🏥 NotificationService.notifyNewCirugia called:', {
      tecnico_asignado_id,
      cirugia_id,
      numero_cirugia
    });

    try {
      // Preparar datos comunes
      const data = {
        cirugia_id,
        numero_cirugia,
        medico_cirujano,
        fecha_programada,
        hospital_nombre
      };

      // Obtener usuarios de logística
      const logistica_ids = await this.getLogisticaUsers();

      // Notificar al técnico asignado (si existe)
      if (tecnico_asignado_id) {
        console.log('📨 Notificando a técnico asignado:', tecnico_asignado_id);
        await this.createNotification(
          tecnico_asignado_id,
          'asignacion_cirugia',
          '🏥 Nueva cirugía asignada',
          `${numero_cirugia} - ${medico_cirujano} en ${hospital_nombre}`,
          'high',
          data,
          `/internal/agenda/${cirugia_id}`
        );
      }

      // Notificar a TODA logística
      if (logistica_ids.length > 0) {
        console.log('📦 Notificando a logística:', logistica_ids);
        await this.notifyUsers(
          logistica_ids,
          'asignacion_cirugia',
          '📋 Nueva cirugía programada',
          `${numero_cirugia} - ${medico_cirujano} (creada por ${creador_nombre})`,
          'medium',
          data,
          `/internal/agenda/${cirugia_id}`
        );
      }

      console.log('✅ NotificationService.notifyNewCirugia: Notifications sent successfully');
    } catch (error) {
      console.error('❌ NotificationService.notifyNewCirugia: Error:', error);
    }
  }

  // Notificar cambio en agenda (fecha, hora, técnico)
  async notifyAgendaChange(
    cirugia_id: string,
    numero_cirugia: string,
    comercial_id: string,
    tecnico_anterior_id: string | null,
    tecnico_nuevo_id: string | null,
    motivo_cambio: string,
    cambios_detalle: string,
    fecha_programada: string,
    hospital_nombre: string,
    is_urgent: boolean = false
  ) {
    try {
      const userIds: string[] = [comercial_id];
      
      // Notificar al técnico anterior si existe y cambió
      if (tecnico_anterior_id && tecnico_anterior_id !== tecnico_nuevo_id) {
        userIds.push(tecnico_anterior_id);
      }
      
      // Notificar al técnico nuevo si existe
      if (tecnico_nuevo_id && tecnico_anterior_id !== tecnico_nuevo_id) {
        userIds.push(tecnico_nuevo_id);
      }

      const priority: NotificationPriority = is_urgent ? 'urgent' : 'high';
      const icon = is_urgent ? '🚨' : '📅';

      await this.notifyUsers(
        userIds.filter((v, i, a) => a.indexOf(v) === i), // Eliminar duplicados
        'cambio_agenda',
        `${icon} Cambio en agenda - ${numero_cirugia}`,
        `${cambios_detalle} en ${hospital_nombre}. Motivo: ${motivo_cambio}`,
        priority,
        {
          cirugia_id,
          numero_cirugia,
          fecha_programada,
          hospital_nombre,
          motivo_cambio,
          tecnico_anterior_id: tecnico_anterior_id || undefined,
          tecnico_nuevo_id: tecnico_nuevo_id || undefined
        },
        `/internal/agenda/${cirugia_id}`
      );

      console.log('✅ NotificationService.notifyAgendaChange: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyAgendaChange: Error:', error);
    }
  }

  // Notificar asignación de mensajero
  async notifyMensajeroAssigned(
    envio_id: string,
    kit_id: string,
    numero_kit: string,
    mensajero_id: string,
    mensajero_nombre: string,
    direccion_destino: string,
    fecha_programada: string
  ) {
    try {
      const logistica_ids = await this.getLogisticaUsers();

      // Notificar a logística
      if (logistica_ids.length > 0) {
        await this.notifyUsers(
          logistica_ids,
          'asignacion_mensajero',
          '🚚 Mensajero asignado',
          `${mensajero_nombre} asignado para entregar ${numero_kit} en ${direccion_destino}`,
          'medium',
          {
            envio_id,
            kit_id,
            numero_kit,
            mensajero_id,
            mensajero_nombre,
            direccion_destino,
            fecha_programada
          },
          `/internal/logistica/envios/${envio_id}`
        );
      }

      console.log('✅ NotificationService.notifyMensajeroAssigned: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyMensajeroAssigned: Error:', error);
    }
  }

  // Notificar cambio de estado de envío
  async notifyDeliveryStatusChange(
    envio_id: string,
    kit_id: string,
    numero_kit: string,
    estado_anterior: string,
    estado_nuevo: string,
    tecnico_id: string | null,
    direccion_destino: string
  ) {
    try {
      const userIds: string[] = [];
      const logistica_ids = await this.getLogisticaUsers();
      userIds.push(...logistica_ids);

      // Si hay técnico receptor, notificar
      if (tecnico_id) {
        userIds.push(tecnico_id);
      }

      const estadosMap: Record<string, string> = {
        programado: 'Programado',
        en_camino: 'En camino',
        entregado: 'Entregado',
        devuelto: 'Devuelto',
        cancelado: 'Cancelado'
      };

      await this.notifyUsers(
        userIds.filter((v, i, a) => a.indexOf(v) === i),
        'cambio_estado_envio',
        '📍 Estado de envío actualizado',
        `${numero_kit}: ${estadosMap[estado_anterior] || estado_anterior} → ${estadosMap[estado_nuevo] || estado_nuevo}`,
        'medium',
        {
          envio_id,
          kit_id,
          numero_kit,
          estado_anterior,
          estado_nuevo,
          direccion_destino
        },
        `/internal/logistica/envios/${envio_id}`
      );

      console.log('✅ NotificationService.notifyDeliveryStatusChange: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyDeliveryStatusChange: Error:', error);
    }
  }

  // Notificar retraso en envío
  async notifyDeliveryDelay(
    envio_id: string,
    kit_id: string,
    numero_kit: string,
    motivo_retraso: string,
    nueva_fecha_estimada: string
  ) {
    try {
      const logistica_ids = await this.getLogisticaUsers();

      if (logistica_ids.length > 0) {
        await this.notifyUsers(
          logistica_ids,
          'retraso_envio',
          '⏱️ Retraso en envío',
          `${numero_kit} retrasado. ${motivo_retraso}. Nueva fecha estimada: ${nueva_fecha_estimada}`,
          'high',
          {
            envio_id,
            kit_id,
            numero_kit,
            motivo_retraso,
            fecha_programada: nueva_fecha_estimada
          },
          `/internal/logistica/envios/${envio_id}`
        );
      }

      console.log('✅ NotificationService.notifyDeliveryDelay: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyDeliveryDelay: Error:', error);
    }
  }

  // Notificar error logístico
  async notifyDeliveryError(
    envio_id: string,
    kit_id: string,
    numero_kit: string,
    tipo_error: string,
    descripcion_error: string
  ) {
    try {
      const logistica_ids = await this.getLogisticaUsers();

      if (logistica_ids.length > 0) {
        await this.notifyUsers(
          logistica_ids,
          'error_logistico',
          '❌ Error en envío',
          `${numero_kit}: ${tipo_error}. ${descripcion_error}`,
          'urgent',
          {
            envio_id,
            kit_id,
            numero_kit,
            tipo_incidente: tipo_error,
            descripcion_incidente: descripcion_error
          },
          `/internal/logistica/envios/${envio_id}`
        );
      }

      console.log('✅ NotificationService.notifyDeliveryError: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyDeliveryError: Error:', error);
    }
  }

  // Notificar solicitud urgente
  async notifyUrgentRequest(
    cirugia_id: string,
    numero_cirugia: string,
    tipo_urgencia: string,
    descripcion: string,
    solicitante_nombre: string
  ) {
    try {
      const logistica_ids = await this.getLogisticaUsers();

      if (logistica_ids.length > 0) {
        await this.notifyUsers(
          logistica_ids,
          'solicitud_urgente',
          '🚨 SOLICITUD URGENTE',
          `${numero_cirugia} - ${tipo_urgencia}: ${descripcion} (por ${solicitante_nombre})`,
          'urgent',
          {
            cirugia_id,
            numero_cirugia,
            tipo_incidente: tipo_urgencia,
            descripcion_incidente: descripcion
          },
          `/internal/agenda/${cirugia_id}`
        );
      }

      console.log('✅ NotificationService.notifyUrgentRequest: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyUrgentRequest: Error:', error);
    }
  }

  // Notificar cambio de estado de hoja de gasto
  async notifyHojaGastoStatusChange(
    hoja_gasto_id: string,
    numero_hoja: string,
    creador_id: string,
    estado_anterior: string,
    estado_nuevo: string,
    aprobador_nombre?: string,
    comentario?: string
  ) {
    try {
      const userIds = [creador_id];

      const estadosMap: Record<string, string> = {
        borrador: 'Borrador',
        pendiente_aprobacion: 'Pendiente de aprobación',
        aprobada: 'Aprobada',
        rechazada: 'Rechazada',
        pagada: 'Pagada'
      };

      const priority: NotificationPriority = estado_nuevo === 'rechazada' ? 'high' : 'medium';

      let mensaje = `${numero_hoja}: ${estadosMap[estado_anterior] || estado_anterior} → ${estadosMap[estado_nuevo] || estado_nuevo}`;
      if (aprobador_nombre) {
        mensaje += ` (por ${aprobador_nombre})`;
      }
      if (comentario) {
        mensaje += `. ${comentario}`;
      }

      await this.notifyUsers(
        userIds,
        'cambio_estado_hoja_gasto',
        '💰 Estado de hoja de gasto',
        mensaje,
        priority,
        {
          hoja_gasto_id,
          numero_hoja,
          estado_anterior,
          estado_nuevo
        },
        `/internal/hojas-gasto/${hoja_gasto_id}`
      );

      console.log('✅ NotificationService.notifyHojaGastoStatusChange: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyHojaGastoStatusChange: Error:', error);
    }
  }

  // Notificar hoja de gasto pendiente de aprobación
  async notifyHojaGastoNeedsApproval(
    hoja_gasto_id: string,
    numero_hoja: string,
    creador_nombre: string,
    monto_total: number,
    cirugia_numero?: string
  ) {
    try {
      // Obtener usuarios con rol que pueden aprobar (admin, supervisor, etc.)
      const { data: aprobadores, error } = await this.supabase.client
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'comercial']) // Ajustar según roles que aprueban
        .eq('is_active', true);

      if (error || !aprobadores || aprobadores.length === 0) {
        console.log('⚠️ No hay aprobadores disponibles');
        return;
      }

      const aprobadorIds = aprobadores.map((u: any) => u.id);

      let mensaje = `${numero_hoja} por ${creador_nombre} - Monto: $${monto_total.toLocaleString()}`;
      if (cirugia_numero) {
        mensaje += ` (${cirugia_numero})`;
      }

      await this.notifyUsers(
        aprobadorIds,
        'aprobacion_pendiente',
        '✍️ Aprobación pendiente',
        mensaje,
        'high',
        {
          hoja_gasto_id,
          numero_hoja,
          monto_total
        },
        `/internal/hojas-gasto/${hoja_gasto_id}`
      );

      console.log('✅ NotificationService.notifyHojaGastoNeedsApproval: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyHojaGastoNeedsApproval: Error:', error);
    }
  }

  // Notificar incidente durante cirugía
  async notifyCirugiaIncident(
    cirugia_id: string,
    numero_cirugia: string,
    tipo_incidente: string,
    descripcion: string,
    reportado_por: string,
    tecnico_id: string | null,
    comercial_id: string
  ) {
    try {
      const userIds = [comercial_id];
      if (tecnico_id) userIds.push(tecnico_id);

      // Notificar también a logística para coordinación
      const logistica_ids = await this.getLogisticaUsers();
      userIds.push(...logistica_ids);

      await this.notifyUsers(
        userIds.filter((v, i, a) => a.indexOf(v) === i),
        'incidente_cirugia',
        '⚕️ Incidente en cirugía',
        `${numero_cirugia} - ${tipo_incidente}: ${descripcion} (reportado por ${reportado_por})`,
        'urgent',
        {
          cirugia_id,
          numero_cirugia,
          tipo_incidente,
          descripcion_incidente: descripcion
        },
        `/internal/agenda/${cirugia_id}`
      );

      console.log('✅ NotificationService.notifyCirugiaIncident: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyCirugiaIncident: Error:', error);
    }
  }

  // Notificar cancelación de cirugía
  async notifyCirugiaCanceled(
    cirugia_id: string,
    numero_cirugia: string,
    motivo_cancelacion: string,
    fecha_programada: string,
    hospital_nombre: string,
    tecnico_id: string | null,
    comercial_id: string,
    cancelado_por: string
  ) {
    try {
      const userIds = [comercial_id];
      if (tecnico_id) userIds.push(tecnico_id);

      // Notificar a logística para liberar recursos
      const logistica_ids = await this.getLogisticaUsers();
      userIds.push(...logistica_ids);

      await this.notifyUsers(
        userIds.filter((v, i, a) => a.indexOf(v) === i),
        'cirugia_cancelada',
        '🚫 Cirugía cancelada',
        `${numero_cirugia} en ${hospital_nombre} (${fecha_programada}) cancelada. Motivo: ${motivo_cancelacion}. Por: ${cancelado_por}`,
        'urgent',
        {
          cirugia_id,
          numero_cirugia,
          fecha_programada,
          hospital_nombre,
          motivo_cambio: motivo_cancelacion
        },
        `/internal/agenda/${cirugia_id}`
      );

      console.log('✅ NotificationService.notifyCirugiaCanceled: Notifications sent');
    } catch (error) {
      console.error('❌ NotificationService.notifyCirugiaCanceled: Error:', error);
    }
  }

  // ======================
  // GESTIÓN DE NOTIFICACIONES
  // ======================
  async markAsRead(notificationId: string) {
    try {
      const { error } = await this.supabase.client
        .from('notificaciones')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Actualizar estado local
      this.notifications.update(notifications =>
        notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    if (!this.userId) return;

    try {
      const { error } = await this.supabase.client
        .from('notificaciones')
        .update({ read: true })
        .eq('user_id', this.userId)
        .eq('read', false);

      if (error) throw error;

      // Actualizar estado local
      this.notifications.update(notifications =>
        notifications.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      const { error } = await this.supabase.client
        .from('notificaciones')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Actualizar estado local
      this.notifications.update(notifications =>
        notifications.filter(n => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  async clearAll() {
    if (!this.userId) return;

    try {
      const { error } = await this.supabase.client
        .from('notificaciones')
        .delete()
        .eq('user_id', this.userId);

      if (error) throw error;

      this.notifications.set([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  // ======================
  // TOASTS
  // ======================
  private showToast(notification: Notification) {
    this.toasts.update(toasts => [...toasts, notification]);

    // Auto-remover después de la duración configurada
    setTimeout(() => {
      this.removeToast(notification.id);
    }, this.config().duration);
  }

  removeToast(notificationId: string) {
    this.toasts.update(toasts => 
      toasts.filter(t => t.id !== notificationId)
    );
  }

  // ======================
  // NAVEGACIÓN
  // ======================
  async navigateToNotification(notification: Notification) {
    // Marcar como leída
    await this.markAsRead(notification.id);

    // Navegar si tiene link
    if (notification.link) {
      this.router.navigate([notification.link]);
    }
  }

  // ======================
  // UTILIDADES
  // ======================

  // Obtener todos los usuarios de logística
  private async getLogisticaUsers(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('id')
        .eq('role', 'logistica')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching logistica users:', error);
        return [];
      }

      const ids = (data || []).map((user: any) => user.id);
      console.log('📦 Logistica users found:', ids.length);
      return ids;
    } catch (error) {
      console.error('❌ Exception getting logistica users:', error);
      return [];
    }
  }

  private getIconForType(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      nuevo_mensaje: '💬',
      cambio_estado_cirugia: '🏥',
      cambio_estado_kit: '📦',
      alerta_stock: '⚠️',
      alerta_vencimiento: '⏰',
      asignacion_cirugia: '📋',
      cambio_agenda: '📅',
      asignacion_mensajero: '🚚',
      cambio_estado_envio: '📍',
      retraso_envio: '⏱️',
      error_logistico: '❌',
      solicitud_urgente: '🚨',
      cambio_estado_hoja_gasto: '💰',
      aprobacion_pendiente: '✍️',
      incidente_cirugia: '⚕️',
      cirugia_cancelada: '🚫',
      cotizacion_aprobada: '✅',
      cotizacion_rechazada: '❌',
      cotizacion_proxima_vencer: '⏰',
      cotizacion_vencida: '⏱️',
      sistema: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  private getColorForPriority(priority: NotificationPriority): string {
    const colors: Record<NotificationPriority, string> = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    };
    return colors[priority];
  }

  private playNotificationSound() {
    // Crear y reproducir un sonido simple
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  updateConfig(config: Partial<NotificationConfig>) {
    this.config.update(current => ({ ...current, ...config }));
  }

  // ======================
  // CLEANUP
  // ======================
  destroy() {
    if (this.channel) {
      this.supabase.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
