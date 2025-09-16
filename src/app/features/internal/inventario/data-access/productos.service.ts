import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { Producto, ProductoCreate } from './models/producto.model';
import { MovimientoInventario, MovimientoCreate, FiltrosMovimientos } from './models/movimiento.model';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private supabase = inject(SupabaseService);

  // ✅ Usar solo columnas que existen en inventario
  getProductos(): Observable<Producto[]> {
    return from(
      this.supabase.client
        .from('productos')
        .select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `)
        .eq('es_activo', true)
        .order('nombre')
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching productos:', response.error);
          throw new Error(response.error.message || 'Error al cargar productos');
        }
        
        const productos = (response.data || []).map(producto => {
          const stock_total = producto.inventario?.reduce((total: number, inv: any) => 
            total + (inv.cantidad || 0), 0) || 0;
          
          return {
            ...producto,
            stock_total,
            unidad_medida: producto.unidad_medida || 'unidad',
            descripcion: producto.descripcion || '',
            proveedor: producto.proveedor || '',
            ubicacion_principal: producto.ubicacion_principal || '',
            notas: producto.notas || '',
            updated_at: producto.updated_at || producto.created_at
          };
        });
        
        return productos;
      }),
      catchError(error => {
        console.error('Service error fetching productos:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Obtener producto por ID
  getProductoById(id: string): Observable<Producto> {
    return from(
      this.supabase.client
        .from('productos')
        .select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching producto:', response.error);
          throw new Error(response.error.message || 'Error al cargar producto');
        }
        
        const producto = response.data;
        const stock_total = producto.inventario?.reduce((total: number, inv: any) => 
          total + (inv.cantidad || 0), 0) || 0;
        
        return {
          ...producto,
          stock_total,
          unidad_medida: producto.unidad_medida || 'unidad',
          descripcion: producto.descripcion || '',
          proveedor: producto.proveedor || '',
          ubicacion_principal: producto.ubicacion_principal || '',
          notas: producto.notas || '',
          updated_at: producto.updated_at || producto.created_at
        };
      }),
      catchError(error => {
        console.error('Service error fetching producto:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Crear nuevo producto
  createProducto(producto: ProductoCreate): Observable<Producto> {
    return from(this.supabase.client.auth.getUser()).pipe(
      switchMap(userResponse => {
        const user = userResponse.data.user;
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        const productoData = {
          codigo: producto.codigo || this.generateProductCode(producto.categoria),
          nombre: producto.nombre,
          categoria: producto.categoria,
          precio: producto.precio,
          stock_minimo: producto.stock_minimo,
          es_activo: true
        };

        return from(
          this.supabase.client
            .from('productos')
            .insert([productoData])
            .select('*')
            .single()
        );
      }),
      map(response => {
        if (response.error) {
          console.error('Error creating producto:', response.error);
          throw new Error(response.error.message || 'Error al crear producto');
        }
        
        return {
          ...response.data,
          stock_total: 0,
          unidad_medida: 'unidad',
          inventario: []
        };
      }),
      catchError(error => {
        console.error('Service error creating producto:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Actualizar producto
  updateProducto(id: string, updates: Partial<Producto>): Observable<Producto> {
    return from(
      this.supabase.client
        .from('productos')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error updating producto:', response.error);
          throw new Error(response.error.message || 'Error al actualizar producto');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error updating producto:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Obtener movimientos con filtros
  getMovimientos(filtros?: FiltrosMovimientos): Observable<MovimientoInventario[]> {
    let query = this.supabase.client
      .from('movimientos_inventario')
      .select(`
        *,
        producto:productos(
          id,
          codigo,
          nombre,
          categoria
        ),
        usuario:profiles(
          id,
          full_name,
          email
        )
      `)
      .order('fecha', { ascending: false });

    // Aplicar filtros
    if (filtros?.fecha_desde) {
      query = query.gte('fecha', filtros.fecha_desde);
    }
    if (filtros?.fecha_hasta) {
      query = query.lte('fecha', filtros.fecha_hasta);
    }
    if (filtros?.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }
    if (filtros?.producto_id) {
      query = query.eq('producto_id', filtros.producto_id);
    }
    if (filtros?.usuario_id) {
      query = query.eq('usuario_id', filtros.usuario_id);
    }

    return from(query).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching movimientos:', response.error);
          throw new Error(response.error.message || 'Error al cargar movimientos');
        }
        
        const movimientos = (response.data || []).map(mov => ({
          ...mov,
          created_at: mov.fecha,
          ubicacion_origen: mov.ubicacion_origen || '',
          ubicacion_destino: mov.ubicacion_destino || '',
          observaciones: mov.observaciones || '',
          referencia: mov.referencia || '',
          lote: mov.lote || '',
          fecha_vencimiento: mov.fecha_vencimiento || ''
        }));
        
        return movimientos;
      }),
      catchError(error => {
        console.error('Service error fetching movimientos:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Registrar movimiento - manejar inventario_id correctamente
  registrarMovimiento(movimiento: MovimientoCreate): Observable<MovimientoInventario> {
    return from(this.supabase.client.auth.getUser()).pipe(
      switchMap(userResponse => {
        const user = userResponse.data.user;
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        // Campos que existen en la BD
        const movimientoData = {
          inventario_id: movimiento.inventario_id, // ✅ Ahora está definido en la interfaz
          producto_id: movimiento.producto_id,
          tipo: movimiento.tipo,
          cantidad: movimiento.cantidad,
          motivo: movimiento.motivo || '',
          usuario_id: user.id
        };

        return from(
          this.supabase.client
            .from('movimientos_inventario')
            .insert([movimientoData])
            .select(`
              *,
              producto:productos(
                id,
                codigo,
                nombre,
                categoria
              ),
              usuario:profiles(
                id,
                full_name,
                email
              )
            `)
            .single()
        );
      }),
      map(response => {
        if (response.error) {
          console.error('Error registrando movimiento:', response.error);
          throw new Error(response.error.message || 'Error al registrar movimiento');
        }
        
        return {
          ...response.data,
          created_at: response.data.fecha
        };
      }),
      catchError(error => {
        console.error('Service error registrando movimiento:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Obtener resumen de movimientos por período
  getResumenMovimientos(fechaDesde: string, fechaHasta: string): Observable<any> {
    return from(
      this.supabase.client
        .rpc('get_resumen_movimientos', {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta
        })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching resumen:', response.error);
          throw new Error(response.error.message || 'Error al cargar resumen');
        }
        return response.data || {};
      }),
      catchError(error => {
        console.error('Service error fetching resumen:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Obtener tipos de movimiento
  getTiposMovimiento() {
    return [
      { value: 'entrada', label: 'Entrada', icon: '➕', color: 'text-green-600' },
      { value: 'salida', label: 'Salida', icon: '➖', color: 'text-red-600' },
      { value: 'ajuste', label: 'Ajuste', icon: '⚖️', color: 'text-blue-600' },
      { value: 'transferencia', label: 'Transferencia', icon: '🔄', color: 'text-purple-600' }
    ];
  }

  // ✅ Obtener motivos comunes
  getMotivosComunes() {
    return {
      entrada: [
        'Compra',
        'Donación',
        'Devolución',
        'Ajuste de inventario',
        'Transferencia recibida'
      ],
      salida: [
        'Uso en cirugía',
        'Venta',
        'Donación',
        'Pérdida',
        'Vencimiento',
        'Transferencia enviada'
      ],
      ajuste: [
        'Corrección de stock',
        'Inventario físico',
        'Error de sistema'
      ],
      transferencia: [
        'Redistribución de stock',
        'Cambio de ubicación',
        'Optimización de inventario'
      ]
    };
  }

  // ✅ Generar código automático
  private generateProductCode(categoria: string): string {
    const prefijos = {
      'implantes': 'IMP',
      'instrumentos': 'INS',
      'consumibles': 'CON',
      'equipos': 'EQU',
      'medicamentos': 'MED'
    };
    
    const prefijo = prefijos[categoria as keyof typeof prefijos] || 'PRD';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefijo}-${timestamp}`;
  }

  // ✅ Obtener categorías disponibles
  getCategorias(): string[] {
    return ['implantes', 'instrumentos', 'consumibles', 'equipos', 'medicamentos'];
  }

  // ✅ Actualizar ubicaciones con sedes reales
  getUbicaciones(): string[] {
    return [
      'sede_principal_norte',
      'sede_principal_sur', 
      'sede_secundaria_este',
      'sede_secundaria_oeste',
      'bodega_central',
      'bodega_norte',
      'bodega_sur',
      'quirofano_sede_norte_1',
      'quirofano_sede_norte_2',
      'quirofano_sede_sur_1',
      'quirofano_sede_sur_2',
      'emergencia_norte',
      'emergencia_sur',
      'esterilizacion_central'
    ];
  }

  // ✅ Obtener ubicaciones con categorías organizadas
  getUbicacionesOrganizadas() {
    return {
      sedes_principales: [
        { value: 'sede_principal_norte', label: 'Sede Principal Norte' },
        { value: 'sede_principal_sur', label: 'Sede Principal Sur' }
      ],
      sedes_secundarias: [
        { value: 'sede_secundaria_este', label: 'Sede Secundaria Este' },
        { value: 'sede_secundaria_oeste', label: 'Sede Secundaria Oeste' }
      ],
      bodegas: [
        { value: 'bodega_central', label: 'Bodega Central' },
        { value: 'bodega_norte', label: 'Bodega Norte' },
        { value: 'bodega_sur', label: 'Bodega Sur' }
      ],
      quirofanos: [
        { value: 'quirofano_sede_norte_1', label: 'Quirófano Norte 1' },
        { value: 'quirofano_sede_norte_2', label: 'Quirófano Norte 2' },
        { value: 'quirofano_sede_sur_1', label: 'Quirófano Sur 1' },
        { value: 'quirofano_sede_sur_2', label: 'Quirófano Sur 2' }
      ],
      emergencias: [
        { value: 'emergencia_norte', label: 'Emergencia Norte' },
        { value: 'emergencia_sur', label: 'Emergencia Sur' }
      ],
      especiales: [
        { value: 'esterilizacion_central', label: 'Esterilización Central' }
      ]
    };
  }

  // ✅ Obtener unidades de medida
  getUnidadesMedida(): string[] {
    return ['unidad', 'caja', 'paquete', 'metro', 'kilogramo', 'litro', 'mililitro', 'gramo'];
  }
}