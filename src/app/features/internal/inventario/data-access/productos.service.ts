import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators'; 

import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { Producto, ProductoCreate, MovimientoInventario } from './models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private supabase = inject(SupabaseService);

  // ✅ Obtener todos los productos
  getProductos(): Observable<Producto[]> {
    return from(
      this.supabase.client
        .from('productos')
        .select(`
          *,
          inventario:inventario_detalle(
            id,
            ubicacion,
            cantidad,
            lote,
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
        return response.data || [];
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
          inventario:inventario_detalle(
            id,
            ubicacion,
            cantidad,
            lote,
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
        return response.data;
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

        // Generar código automático si no se proporciona
        const codigo = producto.codigo || this.generateProductCode(producto.categoria);

        const productoData = {
          ...producto,
          codigo,
          es_activo: true
        };

        return from(
          this.supabase.client
            .from('productos')
            .insert([productoData])
            .select(`
              *,
              inventario:inventario_detalle(
                id,
                ubicacion,
                cantidad,
                lote,
                fecha_vencimiento
              )
            `)
            .single()
        );
      }),
      map(response => {
        if (response.error) {
          console.error('Error creating producto:', response.error);
          throw new Error(response.error.message || 'Error al crear producto');
        }
        return response.data;
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
          inventario:inventario_detalle(
            id,
            ubicacion,
            cantidad,
            lote,
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

  // ✅ Registrar movimiento de inventario
  registrarMovimiento(movimiento: Omit<MovimientoInventario, 'id' | 'created_at' | 'usuario_id'>): Observable<MovimientoInventario> {
    return from(this.supabase.client.auth.getUser()).pipe(
      switchMap(userResponse => {
        const user = userResponse.data.user;
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        const movimientoData = {
          ...movimiento,
          usuario_id: user.id
        };

        return from(
          this.supabase.client
            .from('movimientos_inventario')
            .insert([movimientoData])
            .select(`
              *,
              producto:productos(*),
              usuario:profiles(id, full_name, email)
            `)
            .single()
        );
      }),
      map(response => {
        if (response.error) {
          console.error('Error registrando movimiento:', response.error);
          throw new Error(response.error.message || 'Error al registrar movimiento');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error registrando movimiento:', error);
        return throwError(() => error);
      })
    );
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