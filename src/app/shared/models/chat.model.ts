// ============================================
// MODELOS DE CHAT POR CIRUGÍA
// ============================================

export type TipoMensaje = 'texto' | 'imagen' | 'documento' | 'ubicacion' | 'alerta';

export interface MensajeCirugia {
  id: string;
  cirugia_id: string;
  usuario_id: string;
  mensaje: string;
  tipo: TipoMensaje;
  metadata?: MensajeMetadata;
  leido_por: string[]; // Array de user_ids
  created_at: string;
  updated_at: string;
  
  // Relaciones expandidas (opcional)
  usuario?: {
    id: string;
    full_name: string;
    role: string;
    email?: string;
  };
  cirugia?: {
    id: string;
    numero_cirugia: string;
    estado: string;
    fecha_programada: string;
  };
}

export interface MensajeMetadata {
  // Para archivos
  url?: string;
  nombre?: string;
  tipo_archivo?: string;
  tamano?: number;
  
  // Para ubicación
  latitud?: number;
  longitud?: number;
  direccion?: string;
  
  // Para alertas
  nivel?: 'info' | 'warning' | 'error';
  titulo?: string;
}

export interface ChatCirugiaCompleto {
  cirugia: {
    id: string;
    numero_cirugia: string;
    estado: string;
    fecha_programada: string;
    medico_cirujano: string;
    cliente?: {
      nombre: string;
      apellido: string;
    };
    hospital?: {
      nombre: string;
    };
  };
  participantes: ChatParticipante[];
  mensajes: MensajeCirugia[];
  mensajes_no_leidos: number;
}

export interface ChatParticipante {
  id: string;
  nombre: string;
  rol: string;
  email?: string;
  avatar?: string;
  en_linea?: boolean;
  ultima_actividad?: string;
}

export interface CreateMensajeRequest {
  cirugia_id: string;
  mensaje: string;
  tipo?: TipoMensaje;
  metadata?: MensajeMetadata;
}

export interface ChatListItem {
  cirugia_id: string;
  numero_cirugia: string;
  ultimo_mensaje: string;
  ultimo_mensaje_fecha: string;
  ultimo_mensaje_usuario: string;
  mensajes_no_leidos: number;
  participantes_count: number;
  estado_cirugia: string;
}

export interface MensajeNotificacion {
  id: string;
  cirugia_id: string;
  numero_cirugia: string;
  usuario_nombre: string;
  mensaje_preview: string;
  created_at: string;
}
