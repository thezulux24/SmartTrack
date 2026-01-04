import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../../shared/services/chat.service';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { MensajeCirugia, ChatCirugiaCompleto } from '../../../../shared/models/chat.model';

@Component({
  selector: 'app-chat-cirugia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-cirugia.component.html',
  styleUrl: './chat-cirugia.component.css'
})
export class ChatCirugiaComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  private chatService = inject(ChatService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  chat = signal<ChatCirugiaCompleto | null>(null);
  mensajes = signal<MensajeCirugia[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  enviando = signal(false);

  nuevoMensaje = signal('');
  currentUserId = signal<string | null>(null);

  // Computed
  cirugiaInfo = computed(() => this.chat()?.cirugia);
  participantes = computed(() => this.chat()?.participantes || []);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const cirugiaId = params['id'];
      if (cirugiaId) {
        this.cargarChat(cirugiaId);
        this.suscribirMensajes(cirugiaId);
      }
    });

    this.getCurrentUser();
  }

  ngOnDestroy() {
    const cirugiaId = this.route.snapshot.params['id'];
    if (cirugiaId) {
      this.chatService.desuscribirMensajes(cirugiaId);
    }
  }

  async getCurrentUser() {
    const session = await this.supabaseService.getSession();
    this.currentUserId.set(session?.user?.id || null);
  }

  cargarChat(cirugiaId: string) {
    this.loading.set(true);
    this.error.set(null);

    this.chatService.getChatCompleto(cirugiaId).subscribe({
      next: (data: ChatCirugiaCompleto) => {
        this.chat.set(data);
        this.mensajes.set(data.mensajes);
        this.loading.set(false);
        
        // Marcar como leído
        this.chatService.marcarComoLeido(cirugiaId).subscribe();
        
        // Scroll al final
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err: any) => {
        console.error('Error al cargar chat:', err);
        this.error.set('Error al cargar el chat');
        this.loading.set(false);
      }
    });
  }

  suscribirMensajes(cirugiaId: string) {
    
    this.chatService.suscribirMensajes(cirugiaId, (mensaje: MensajeCirugia) => {
      
      // Evitar duplicados: verificar si el mensaje ya existe
      const mensajesActuales = this.mensajes();
      const existe = mensajesActuales.some(m => m.id === mensaje.id);
      
      if (!existe) {
        this.mensajes.update(msgs => [...msgs, mensaje]);
        
        // Scroll al final
        setTimeout(() => this.scrollToBottom(), 100);
      }
      
      // Marcar como leído si no es mi mensaje
      if (mensaje.usuario_id !== this.currentUserId()) {
        this.chatService.marcarComoLeido(cirugiaId).subscribe();
      }
    });
    
  }

  enviarMensaje() {
    const mensaje = this.nuevoMensaje().trim();
    if (!mensaje || this.enviando()) return;

    const cirugiaId = this.route.snapshot.params['id'];
    if (!cirugiaId) return;


    
    this.enviando.set(true);

    this.chatService.enviarMensaje({
      cirugia_id: cirugiaId,
      mensaje: mensaje,
      tipo: 'texto'
    }).subscribe({
      next: (nuevoMensaje: MensajeCirugia) => {

        // Agregar el mensaje a la lista local inmediatamente
        const mensajesActuales = this.mensajes();
        const existe = mensajesActuales.some(m => m.id === nuevoMensaje.id);
        
        if (!existe) {
          this.mensajes.update(msgs => [...msgs, nuevoMensaje]);
        }
        
        this.nuevoMensaje.set('');
        this.enviando.set(false);
        
        // Scroll al final
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err: any) => {
        console.error('❌ ChatComponent: Error sending message:', err);
        alert('Error al enviar mensaje');
        this.enviando.set(false);
      }
    });
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  scrollToBottom() {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling:', err);
    }
  }

  esMiMensaje(mensaje: MensajeCirugia): boolean {
    return mensaje.usuario_id === this.currentUserId();
  }

  getNombreUsuario(mensaje: MensajeCirugia): string {
    return mensaje.usuario?.full_name || 'Usuario';
  }

  getRolUsuario(mensaje: MensajeCirugia): string {
    const rol = mensaje.usuario?.role || '';
    const roles: Record<string, string> = {
      'comercial': 'Comercial',
      'tecnico': 'Técnico',
      'logistica': 'Logística',
      'admin': 'Admin'
    };
    return roles[rol] || rol;
  }

  getRolColor(rol: string): string {
    const colors: Record<string, string> = {
      'comercial': 'bg-blue-500/20 text-blue-300',
      'tecnico': 'bg-green-500/20 text-green-300',
      'logistica': 'bg-purple-500/20 text-purple-300',
      'admin': 'bg-red-500/20 text-red-300'
    };
    return colors[rol] || 'bg-gray-500/20 text-gray-300';
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const timeStr = date.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${timeStr}`;
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer ${timeStr}`;
    } else {
      return date.toLocaleDateString('es-CO', { 
        day: '2-digit', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  volver() {
    this.router.navigate(['/internal']);
  }

  abrirArchivos() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      // TODO: Implementar subida de archivos a Supabase Storage
      console.log('Archivo seleccionado:', input.files[0]);
      alert('Función de archivos en desarrollo');
    }
  }

  enviarUbicacion() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const cirugiaId = this.route.snapshot.params['id'];
          this.enviando.set(true);

          this.chatService.enviarMensaje({
            cirugia_id: cirugiaId,
            mensaje: '📍 Ubicación compartida',
            tipo: 'ubicacion',
            metadata: {
              latitud: position.coords.latitude,
              longitud: position.coords.longitude
            }
          }).subscribe({
            next: (nuevoMensaje: MensajeCirugia) => {
              // Agregar el mensaje a la lista local inmediatamente
              this.mensajes.update(msgs => [...msgs, nuevoMensaje]);
              this.enviando.set(false);
              
              // Scroll al final
              setTimeout(() => this.scrollToBottom(), 100);
            },
            error: (err: any) => {
              console.error('Error al enviar ubicación:', err);
              alert('Error al compartir ubicación');
              this.enviando.set(false);
            }
          });
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          alert('No se pudo obtener la ubicación');
        }
      );
    } else {
      alert('Geolocalización no disponible');
    }
  }

  verEnMapa(latitud: number | undefined, longitud: number | undefined) {
    if (latitud && longitud) {
      window.open(`https://www.google.com/maps?q=${latitud},${longitud}`, '_blank');
    }
  }
}
