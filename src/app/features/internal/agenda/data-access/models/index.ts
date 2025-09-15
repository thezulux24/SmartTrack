// Barrel export para facilitar imports
export * from './cirugia.model';
export * from './hospital.model';
export * from './tipo-cirugia.model';
export * from './agenda-tecnico.model';

// Re-export de modelos necesarios de otros módulos
export interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  role: string;
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
  precio?: number;
  stock_minimo: number;
  es_activo: boolean;
  created_at: string;
}