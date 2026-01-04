export interface Hospital {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  contacto_principal?: string;
  email?: string;
  ciudad?: string;
  es_activo: boolean;
  notas?: string;
  created_at: string;
}

export interface HospitalCreate {
  nombre: string;
  direccion?: string;
  telefono?: string;
  contacto_principal?: string;
  email?: string;
  ciudad?: string;
  es_activo?: boolean;
  notas?: string;
}