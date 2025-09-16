export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: 'implantes' | 'instrumentos' | 'consumibles' | 'equipos' | 'medicamentos';
  precio: number;
  stock_minimo: number;
  stock_total: number;
  unidad_medida: string;
  proveedor?: string;
  ubicacion_principal?: string; // ✅ Ahora será sede_principal_norte, etc.
  es_activo: boolean;
  notas?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  inventario?: InventarioDetalle[];
}

export interface InventarioDetalle {
  id: string;
  producto_id: string;
  ubicacion: string; // ✅ Ubicaciones por sede
  cantidad: number;
  lote?: string;
  fecha_vencimiento?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductoCreate {
  codigo?: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precio: number;
  stock_minimo: number;
  unidad_medida: string;
  proveedor?: string;
  ubicacion_principal?: string;
  notas?: string;
}

export interface MovimientoInventario {
  id: string;
  producto_id: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  cantidad: number;
  ubicacion_origen?: string;
  ubicacion_destino?: string;
  motivo?: string;
  usuario_id: string;
  referencia?: string;
  created_at: string;
  
  // Relaciones expandidas
  producto?: Producto;
  usuario?: {
    id: string;
    full_name: string;
    email: string;
  };
}