import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap, BehaviorSubject, tap } from 'rxjs';
import { SupabaseService } from '../data-access/supabase.service';
import {
  MensajeCirugia,
  CreateMensajeRequest,
  ChatCirugiaCompleto,
  ChatListItem,
  ChatParticipante
} from '../models/chat.model';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private activeChannels = new Map<string, RealtimeChannel>();
  private unreadCountsSubject = new BehaviorSubject<Map<string, number>>(new Map());
  
  public unreadCounts$ = this.unreadCountsSubject.asObservable();

  /**
   * Obtener todos los mensajes de una cirugía
   */
  getMensajesCirugia(cirugiaId: string): Observable<MensajeCirugia[]> {
    return from(
      this.supabase.client
        .from('mensajes_cirugia')
        .select(`
          *,
          usuario:profiles(id, full_name, role, email)
        `)
        .eq('cirugia_id', cirugiaId)
        .order('created_at', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Enviar un mensaje
   */
  enviarMensaje(request: CreateMensajeRequest): Observable<MensajeCirugia> {
    return from(this.supabase.getSession()).pipe(
      switchMap(session => {
        if (!session?.user?.id) {
          throw new Error('Usuario no autenticado');
        }

        return from(
          this.supabase.client
            .from('mensajes_cirugia')
            .insert({
              cirugia_id: request.cirugia_id,
              usuario_id: session.user.id,
              mensaje: request.mensaje,
              tipo: request.tipo || 'texto',
              metadata: request.metadata || {}
            })
            .select(`
              *,
              usuario:profiles(id, full_name, role, email)
            `)
            .single()
        );
      }),
      map(({ data, error }) => {
        if (error) throw error;
        return data as MensajeCirugia;
      }),
      tap(async (mensaje) => {
        // Enviar notificaciones a otros participantes
        await this.notifyParticipants(mensaje);
      })
    );
  }

  /**
   * Notificar a participantes sobre nuevo mensaje
   */
  private async notifyParticipants(mensaje: MensajeCirugia) {
    try {
      const session = await this.supabase.getSession();
      if (!session?.user?.id) {
        console.warn('⚠️ ChatService: No session, skipping notifications');
        return;
      }

      // Obtener info de la cirugía y participantes
      const { data: cirugia } = await this.supabase.client
        .from('cirugias')
        .select(`
          id,
          numero_cirugia,
          usuario_creador_id,
          tecnico_asignado_id
        `)
        .eq('id', mensaje.cirugia_id)
        .single();

      if (!cirugia) {
        console.warn('⚠️ ChatService: Cirugia not found');
        return;
      }

      // Obtener logística (si existe kit asignado)
      const { data: kits } = await this.supabase.client
        .from('kits_cirugia')
        .select('logistica_id')
        .eq('cirugia_id', mensaje.cirugia_id)
        .limit(1);

      // Recopilar IDs de participantes (excluyendo al remitente)
      const participantIds = new Set<string>();
      
      if (cirugia.usuario_creador_id && cirugia.usuario_creador_id !== session.user.id) {
        participantIds.add(cirugia.usuario_creador_id);
      }
      
      if (cirugia.tecnico_asignado_id && cirugia.tecnico_asignado_id !== session.user.id) {
        participantIds.add(cirugia.tecnico_asignado_id);
      }

      if (kits && kits.length > 0 && kits[0].logistica_id) {
        if (kits[0].logistica_id !== session.user.id) {
          participantIds.add(kits[0].logistica_id);
        }
      }

      // Enviar notificaciones
      if (participantIds.size > 0) {
        const remitente = mensaje.usuario?.full_name || 'Usuario';
        const preview = mensaje.tipo === 'texto' 
          ? mensaje.mensaje 
          : mensaje.tipo === 'ubicacion' 
            ? '📍 Compartió ubicación' 
            : '📎 Envió un archivo';

        await this.notificationService.notifyNewMessage(
          Array.from(participantIds),
          mensaje.cirugia_id,
          cirugia.numero_cirugia,
          remitente,
          preview
        );
      }
    } catch (error) {
      console.error('❌ ChatService: Error notifying participants:', error);
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  marcarComoLeido(cirugiaId: string): Observable<void> {
    return from(this.supabase.getSession()).pipe(
      switchMap(session => {
        if (!session?.user?.id) {
          throw new Error('Usuario no autenticado');
        }

        return from(
          this.supabase.client.rpc('mark_messages_as_read', {
            p_cirugia_id: cirugiaId,
            p_user_id: session.user.id
          })
        );
      }),
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  /**
   * Obtener conteo de mensajes no leídos por cirugía
   */
  getUnreadCount(cirugiaId: string): Observable<number> {
    return from(this.supabase.getSession()).pipe(
      switchMap(session => {
        if (!session?.user?.id) {
          return from(Promise.resolve(0));
        }

        return from(
          this.supabase.client.rpc('get_unread_messages_count', {
            p_user_id: session.user.id,
            p_cirugia_id: cirugiaId
          })
        );
      }),
      map((response: any) => {
        if (response.error) {
          console.error('Error getting unread count:', response.error);
          return 0;
        }
        return response.data as number || 0;
      })
    );
  }

  /**
   * Obtener lista de chats (cirugías con mensajes)
   */
  getChatList(): Observable<ChatListItem[]> {
    return from(this.supabase.getSession()).pipe(
      switchMap(async session => {
        if (!session?.user?.id) {
          throw new Error('Usuario no autenticado');
        }

        // Obtener rol del usuario
        const { data: profile } = await this.supabase.client
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        let cirugias: any[] = [];

        // Si es logística o admin, obtener todas las cirugías
        if (profile?.role === 'logistica' || profile?.role === 'admin') {
          const { data, error: cirError } = await this.supabase.client
            .from('cirugias')
            .select(`
              id,
              numero_cirugia,
              estado,
              usuario_creador_id,
              tecnico_asignado_id
            `)
            .order('fecha_programada', { ascending: false });

          if (cirError) throw cirError;
          cirugias = data || [];
        } else {
          // Para comercial y técnico, solo sus cirugías
          const { data, error: cirError } = await this.supabase.client
            .from('cirugias')
            .select(`
              id,
              numero_cirugia,
              estado,
              usuario_creador_id,
              tecnico_asignado_id
            `)
            .or(`usuario_creador_id.eq.${session.user.id},tecnico_asignado_id.eq.${session.user.id}`);

          if (cirError) throw cirError;
          cirugias = data || [];
        }

        const cirugiaIds = cirugias?.map(c => c.id) || [];

        if (cirugiaIds.length === 0) {
          return [];
        }

        // Obtener último mensaje de cada cirugía
        const chatList: ChatListItem[] = [];

        for (const cirugia of cirugias || []) {
          const { data: mensajes } = await this.supabase.client
            .from('mensajes_cirugia')
            .select(`
              mensaje,
              created_at,
              usuario:profiles(full_name)
            `)
            .eq('cirugia_id', cirugia.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const ultimoMensaje = mensajes && mensajes.length > 0 ? mensajes[0] : null;

          // Solo agregar cirugías que tienen mensajes
          if (!ultimoMensaje) {
            continue; // Saltar cirugías sin mensajes
          }

          const { data: unreadCount } = await this.supabase.client
            .rpc('get_unread_messages_count', {
              p_user_id: session.user.id,
              p_cirugia_id: cirugia.id
            });

          chatList.push({
            cirugia_id: cirugia.id,
            numero_cirugia: cirugia.numero_cirugia,
            ultimo_mensaje: ultimoMensaje.mensaje,
            ultimo_mensaje_fecha: ultimoMensaje.created_at,
            ultimo_mensaje_usuario: (ultimoMensaje.usuario as any)?.full_name || 'Desconocido',
            mensajes_no_leidos: unreadCount || 0,
            participantes_count: 2, // TODO: calcular correctamente
            estado_cirugia: cirugia.estado
          });
        }

        return chatList.sort((a, b) => 
          new Date(b.ultimo_mensaje_fecha).getTime() - new Date(a.ultimo_mensaje_fecha).getTime()
        );
      })
    );
  }

  /**
   * Obtener información completa del chat (cirugía + participantes + mensajes)
   */
  getChatCompleto(cirugiaId: string): Observable<ChatCirugiaCompleto> {
    return from(this.supabase.getSession()).pipe(
      switchMap(async session => {
        if (!session?.user?.id) {
          throw new Error('Usuario no autenticado');
        }

        // Obtener cirugía
        const { data: cirugia, error: cirError } = await this.supabase.client
          .from('cirugias')
          .select(`
            id,
            numero_cirugia,
            estado,
            fecha_programada,
            medico_cirujano,
            usuario_creador_id,
            tecnico_asignado_id,
            cliente:clientes(nombre, apellido),
            hospital:hospitales(nombre)
          `)
          .eq('id', cirugiaId)
          .single();

        if (cirError) throw cirError;

        // Obtener participantes
        const participantes: ChatParticipante[] = [];
        
        // Comercial (creador)
        if (cirugia.usuario_creador_id) {
          const { data: comercial } = await this.supabase.client
            .from('profiles')
            .select('id, full_name, role, email')
            .eq('id', cirugia.usuario_creador_id)
            .single();
          
          if (comercial) {
            participantes.push({
              id: comercial.id,
              nombre: comercial.full_name,
              rol: comercial.role,
              email: comercial.email
            });
          }
        }

        // Técnico
        if (cirugia.tecnico_asignado_id) {
          const { data: tecnico } = await this.supabase.client
            .from('profiles')
            .select('id, full_name, role, email')
            .eq('id', cirugia.tecnico_asignado_id)
            .single();
          
          if (tecnico) {
            participantes.push({
              id: tecnico.id,
              nombre: tecnico.full_name,
              rol: tecnico.role,
              email: tecnico.email
            });
          }
        }

        // TODO: Obtener logística (preparadores de kits)

        // Obtener mensajes
        const { data: mensajes, error: msgError } = await this.supabase.client
          .from('mensajes_cirugia')
          .select(`
            *,
            usuario:profiles(id, full_name, role, email)
          `)
          .eq('cirugia_id', cirugiaId)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        // Obtener conteo no leídos
        const { data: unreadCount } = await this.supabase.client
          .rpc('get_unread_messages_count', {
            p_user_id: session.user.id,
            p_cirugia_id: cirugiaId
          });

        return {
          cirugia: {
            id: cirugia.id,
            numero_cirugia: cirugia.numero_cirugia,
            estado: cirugia.estado,
            fecha_programada: cirugia.fecha_programada,
            medico_cirujano: cirugia.medico_cirujano,
            cliente: Array.isArray(cirugia.cliente) ? cirugia.cliente[0] : cirugia.cliente,
            hospital: Array.isArray(cirugia.hospital) ? cirugia.hospital[0] : cirugia.hospital
          },
          participantes,
          mensajes: mensajes || [],
          mensajes_no_leidos: unreadCount || 0
        };
      })
    );
  }

  /**
   * Suscribirse a mensajes en tiempo real
   */
  suscribirMensajes(cirugiaId: string, callback: (mensaje: MensajeCirugia) => void): void {
    // Desuscribir canal existente si hay
    this.desuscribirMensajes(cirugiaId);

    const channelName = `chat_${cirugiaId}`;

    const channel = this.supabase.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_cirugia',
          filter: `cirugia_id=eq.${cirugiaId}`
        },
        async (payload) => {
          // Obtener info completa del mensaje con relaciones
          const messageId = (payload.new as any)['id'];
          
          const { data, error } = await this.supabase.client
            .from('mensajes_cirugia')
            .select(`
              *,
              usuario:profiles(id, full_name, role, email)
            `)
            .eq('id', messageId)
            .single();

          if (error) {
            console.error('❌ ChatService: Error fetching message:', error);
            return;
          }

          if (data) {
            callback(data as MensajeCirugia);
          }
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error('❌ ChatService: Subscription error:', error);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ ChatService: Channel error - Check if Realtime is enabled for mensajes_cirugia');
        }
        if (status === 'TIMED_OUT') {
          console.error('❌ ChatService: Subscription timed out');
        }
      });

    this.activeChannels.set(cirugiaId, channel);
  }

  /**
   * Desuscribirse de mensajes en tiempo real
   */
  desuscribirMensajes(cirugiaId: string): void {
    const channel = this.activeChannels.get(cirugiaId);
    if (channel) {
      this.supabase.client.removeChannel(channel);
      this.activeChannels.delete(cirugiaId);
    }
  }

  /**
   * Limpiar todas las suscripciones
   */
  limpiarSuscripciones(): void {
    this.activeChannels.forEach(channel => {
      this.supabase.client.removeChannel(channel);
    });
    this.activeChannels.clear();
  }

  /**
   * Actualizar conteos de mensajes no leídos
   */
  async actualizarUnreadCounts(): Promise<void> {
    const session = await this.supabase.getSession();
    if (!session?.user?.id) return;

    // Obtener todas las cirugías del usuario
    const { data: cirugias } = await this.supabase.client
      .from('cirugias')
      .select('id')
      .or(`usuario_creador_id.eq.${session.user.id},tecnico_asignado_id.eq.${session.user.id}`);

    if (!cirugias) return;

    const counts = new Map<string, number>();
    
    for (const cirugia of cirugias) {
      const { data: count } = await this.supabase.client
        .rpc('get_unread_messages_count', {
          p_user_id: session.user.id,
          p_cirugia_id: cirugia.id
        });
      
      if (count && count > 0) {
        counts.set(cirugia.id, count);
      }
    }

    this.unreadCountsSubject.next(counts);
  }
}
