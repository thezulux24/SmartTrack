import { Profile } from "./index";

export interface AgendaTecnico {
  id: string;
  tecnico_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  motivo_no_disponible?: string;
  created_at: string;
  
  // Relación
  tecnico?: Profile;
}

export interface AgendaTecnicoCreate {
  tecnico_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  disponible?: boolean;
  motivo_no_disponible?: string;
}