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
        sistema: 0
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
      this.supabase.client.removeChannel(this.channel);
    }

    console.log('🔌 NotificationService: Subscribing to realtime channel for', this.userId);

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
          console.log('📬 NotificationService: Received new notification via realtime', payload);
          const notification = payload.new as Notification;
          this.handleNewNotification(notification);
        }
      )
      .subscribe((status) => {
        console.log('🔌 NotificationService: Subscription status:', status);
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
  private getIconForType(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      nuevo_mensaje: '💬',
      cambio_estado_cirugia: '🏥',
      cambio_estado_kit: '📦',
      alerta_stock: '⚠️',
      alerta_vencimiento: '⏰',
      asignacion_cirugia: '📋',
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
