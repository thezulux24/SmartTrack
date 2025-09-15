export interface TipoCirugia {
  id: string;
  nombre: string;
  descripcion?: string;
  duracion_promedio?: number;
  productos_comunes?: string[]; // Array de IDs de productos
  especialidad?: string;
  es_activo: boolean;
  created_at: string;
}

export interface TipoCirugiaCreate {
  nombre: string;
  descripcion?: string;
  duracion_promedio?: number;
  productos_comunes?: string[];
  especialidad?: string;
}