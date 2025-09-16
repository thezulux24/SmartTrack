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

  // ✅ Obtener ubicaciones disponibles
  getUbicaciones(): string[] {
    return ['bodega', 'quirofano_1', 'quirofano_2', 'quirofano_3', 'emergencia', 'esterilizacion'];
  }

  // ✅ Obtener unidades de medida
  getUnidadesMedida(): string[] {
    return ['unidad', 'caja', 'paquete', 'metro', 'kilogramo', 'litro', 'mililitro', 'gramo'];
  }
}