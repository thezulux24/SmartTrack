import { Producto, Profile } from "./index";
import { TecnicoAsignado } from "./agenda-tecnico.model";
import { Hospital } from "./hospital.model";
import { TipoCirugia } from "./tipo-cirugia.model";

export interface Cirugia {
  id: string;
  numero_cirugia: string;
  paciente_nombre: string;
  paciente_documento?: string;
  paciente_telefono?: string;
  
  // FK - Referencias reales
  hospital_id: string;
  tipo_cirugia_id: string;
  
  // Campos de texto (legacy/temporal)
  hospital?: string;
  tipo_cirugia?: string;
  
  medico_cirujano: string;
  fecha_programada: string;
  hora_inicio?: string;
  duracion_estimada?: number;
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada' | 'urgencia';
  prioridad: 'baja' | 'normal' | 'alta' | 'urgencia';
  notas?: string;
  tecnico_asignado_id?: string;
  usuario_creador_id: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones expandidas
  tecnico_asignado?: TecnicoAsignado;
  hospital_data?: Hospital;
  tipo_cirugia_data?: TipoCirugia;
}

export interface CirugiaCreate {
  numero_cirugia: string;
  paciente_nombre: string;
  paciente_documento?: string;
  paciente_telefono?: string;
  hospital_id: string;
  tipo_cirugia_id: string;
  medico_cirujano: string;
  fecha_programada: string;
  hora_inicio?: string;
  duracion_estimada?: number;
  estado?: string;
  prioridad?: string;
  notas?: string;
  tecnico_asignado_id?: string;
}

export interface CirugiaProducto {
  id: string;
  cirugia_id: string;
  producto_id: string;
  cantidad_requerida: number;
  cantidad_utilizada: number;
  es_implante: boolean;
  numero_lote?: string;
  fecha_vencimiento?: string;
  observaciones?: string;
  created_at: string;
  
  // Relación
  producto?: Producto;
}