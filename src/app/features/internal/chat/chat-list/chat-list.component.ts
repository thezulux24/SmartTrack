import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../../../shared/services/chat.service';
import { ChatListItem } from '../../../../shared/models/chat.model';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './chat-list.component.html',
  styleUrl: './chat-list.component.css'
})
export class ChatListComponent implements OnInit {
  private chatService = inject(ChatService);
  private router = inject(Router);

  chats = signal<ChatListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.cargarChats();
  }

  cargarChats() {
    this.loading.set(true);
    this.error.set(null);

    this.chatService.getChatList().subscribe({
      next: (data: ChatListItem[]) => {
        this.chats.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar chats:', err);
        this.error.set('Error al cargar los chats');
        this.loading.set(false);
      }
    });
  }

  abrirChat(cirugiaId: string) {
    this.router.navigate(['/internal/chat', cirugiaId]);
  }

  getEstadoColor(estado: string): string {
    const colors: Record<string, string> = {
      'programada': 'bg-blue-500/20 text-blue-300 border-blue-400/40',
      'en_curso': 'bg-green-500/20 text-green-300 border-green-400/40',
      'completada': 'bg-gray-500/20 text-gray-300 border-gray-400/40',
      'cancelada': 'bg-red-500/20 text-red-300 border-red-400/40',
      'urgencia': 'bg-red-500/30 text-red-200 border-red-400/50'
    };
    return colors[estado] || 'bg-gray-500/20 text-gray-300';
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      'programada': 'Programada',
      'en_curso': 'En Curso',
      'completada': 'Completada',
      'cancelada': 'Cancelada',
      'urgencia': 'Urgencia'
    };
    return labels[estado] || estado;
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
      return timeStr;
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer ${timeStr}`;
    } else {
      return date.toLocaleDateString('es-CO', { 
        day: '2-digit', 
        month: 'short'
      });
    }
  }

  volver() {
    this.router.navigate(['/internal']);
  }

  refrescar() {
    this.cargarChats();
  }
}
