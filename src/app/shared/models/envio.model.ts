// ═══════════════════════════════════════════════════════════════════
// MODELOS SIMPLIFICADOS - SISTEMA DE MENSAJEROS Y ENVÍOS
// ═══════════════════════════════════════════════════════════════════

// Mensajero - Versión simple
export interface Mensajero {
  id: string;
  nombre: string;
  telefono: string;
  placa?: string;
  estado: 'disponible' | 'ocupado';
  created_at?: string;
}

// Envío - Versión simple
export interface Envio {
  id: string;
  kit_id: string;
  mensajero_id: string;
  direccion_destino: string;
  contacto_destino?: string;
  telefono_destino?: string;
  fecha_programada: string;
  hora_salida?: string;
  hora_llegada?: string;
  estado: 'programado' | 'en_transito' | 'entregado';
  observaciones?: string;
  created_at?: string;

  // Relaciones (para joins)
  kit?: any;
  mensajero?: Mensajero;
}

// DTO para crear envío
export interface AsignacionEnvioDTO {
  kit_id: string;
  mensajero_id: string;
  direccion_destino: string;
  contacto_destino?: string;
  telefono_destino?: string;
  fecha_programada: string;
  observaciones?: string;
}
