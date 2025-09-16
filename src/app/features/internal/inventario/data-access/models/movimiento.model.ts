export interface MovimientoInventario {
  id: string;
  inventario_id: string;
  producto_id: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  cantidad: number;
  motivo: string;
  usuario_id: string;
  fecha: string;
  
  // Campo mapeado para compatibilidad
  created_at: string;
  
  // Campos opcionales
  ubicacion_origen?: string;
  ubicacion_destino?: string;
  observaciones?: string;
  referencia?: string;
  lote?: string;
  fecha_vencimiento?: string;
  
  // Relaciones expandidas
  producto?: {
    id: string;
    codigo: string;
    nombre: string;
    categoria: string;
  };
  usuario?: {
    id: string;
    full_name: string;
    email: string;
    area?: string;
  };
}

export interface MovimientoCreate {
  inventario_id: string; // ✅ Agregar este campo requerido
  producto_id: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
  cantidad: number;
  motivo?: string;
  ubicacion_origen?: string;
  ubicacion_destino?: string;
  observaciones?: string;
  referencia?: string;
  lote?: string;
  fecha_vencimiento?: string;
}

export interface FiltrosMovimientos {
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: string;
  producto_id?: string;
  ubicacion?: string;
  usuario_id?: string;
}