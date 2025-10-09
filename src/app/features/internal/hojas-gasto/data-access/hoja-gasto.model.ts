// Modelos para Hojas de Gasto Digital
export type EstadoHojaGasto = 'borrador' | 'revision' | 'aprobada' | 'rechazada';
export type CategoriaProducto = 'productos' | 'transporte' | 'otros';
export const ESTADOS_CONFIG = {
  'borrador': { label: 'Borrador', color: 'bg-gray-100 text-gray-800', descripcion: 'En proceso' },
  'revision': { label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800', descripcion: 'Revisión' },
  'aprobada': { label: 'Aprobada', color: 'bg-green-100 text-green-800', descripcion: 'Aprobada' },
  'rechazada': { label: 'Rechazada', color: 'bg-red-100 text-red-800', descripcion: 'Rechazada' }
} as const;
export const CATEGORIAS_CONFIG = {
  'productos': { label: 'Productos Médicos', color: 'bg-blue-100 text-blue-800', icon: '' },
  'transporte': { label: 'Transporte', color: 'bg-green-100 text-green-800', icon: '' },
  'otros': { label: 'Otros Gastos', color: 'bg-gray-100 text-gray-800', icon: '' }
} as const;
export interface HojaGasto {
  id: string;
  numero_hoja: string;
  cirugia_id: string;
  tecnico_id: string;
  fecha_cirugia: string;
  fecha_creacion: string;
  estado: EstadoHojaGasto;
  total_productos: number;
  total_transporte: number;
  total_otros: number;
  total_general: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Relaciones
  items?: HojaGastoItem[];
  hoja_gasto_items?: HojaGastoItem[];
  // Relaciones expandidas
  tecnico?: {
    id: string;
    full_name: string;
    email: string;
  };
  cirugia?: {
    id: string;
    numero_cirugia: string;
    medico_cirujano: string;
    fecha_programada: string;
    cliente?: {
      nombre: string;
      apellido: string;
    };
    hospital?: {
      nombre: string;
    };
  };
}

export interface HojaGastoItem {
  id?: string;
  hoja_gasto_id: string;
  producto_id?: string;
  categoria: CategoriaProducto;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  fecha_gasto?: string;
  comprobante_url?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
  // Alias para compatibilidad con componentes
  nombre_producto?: string;
  cantidad_usada?: number;
  subtotal?: number;
}

export interface CreateHojaGastoRequest {
  cirugia_id: string;
  tecnico_id: string;
  fecha_cirugia: string;
  observaciones?: string;
  items?: HojaGastoItem[];
}

export interface UpdateHojaGastoRequest {
  estado?: EstadoHojaGasto;
  observaciones?: string;
  items?: HojaGastoItem[];
}
export interface CreateHojaGastoItemRequest { hoja_gasto_id: string; producto_id?: string; categoria: CategoriaProducto; descripcion: string; cantidad: number; precio_unitario: number; fecha_gasto?: string; comprobante_url?: string; observaciones?: string; }
export interface UpdateHojaGastoItemRequest { categoria?: CategoriaProducto; descripcion?: string; cantidad?: number; precio_unitario?: number; fecha_gasto?: string; comprobante_url?: string; observaciones?: string; }
export interface HojaGastoFilters { estado?: EstadoHojaGasto; tecnico_id?: string; fecha_desde?: string; fecha_hasta?: string; cirugia_id?: string; }
