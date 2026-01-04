// Exportar todos los modelos
export * from './cirugia.model';
export * from './hospital.model';
export * from './tipo-cirugia.model';
export * from './agenda-tecnico.model';

// Modelos adicionales que faltan
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'client' | 'comercial' | 'soporte_tecnico' | 'logistica' | 'admin';
  area?: string;
  company_name?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock_minimo: number;
  es_activo: boolean;
  created_at: string;
}

// Tipos para filtros y búsquedas
export interface CirugiaFilters {
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  tecnico_id?: string;
  hospital_id?: string;
  tipo_cirugia_id?: string;
  prioridad?: string;
  search?: string;
}

export interface CirugiaSeguimiento {
  id: string;
  cirugia_id: string;
  estado_anterior?: string;
  estado_nuevo: string;
  comentario?: string;
  usuario_id: string;
  fecha_cambio: string;
}