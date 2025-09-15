import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { TipoCirugia, TipoCirugiaCreate, Producto } from './models';

@Injectable({
  providedIn: 'root'
})
export class TiposCirugiaService {
  constructor(private supabase: SupabaseService) {}

  getTiposCirugia(): Observable<TipoCirugia[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('tipos_cirugia')
        .select('*')
        .eq('es_activo', true)
        .order('nombre', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data || []);
            observer.complete();
          }
        });
    });
  }

  getTipoCirugiaById(id: string): Observable<TipoCirugia> {
    return new Observable(observer => {
      this.supabase.client
        .from('tipos_cirugia')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data);
            observer.complete();
          }
        });
    });
  }

  createTipoCirugia(tipoCirugia: TipoCirugiaCreate): Observable<TipoCirugia> {
    return new Observable(observer => {
      this.supabase.client
        .from('tipos_cirugia')
        .insert(tipoCirugia)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data);
            observer.complete();
          }
        });
    });
  }

  updateTipoCirugia(id: string, updates: Partial<TipoCirugia>): Observable<TipoCirugia> {
    return new Observable(observer => {
      this.supabase.client
        .from('tipos_cirugia')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data);
            observer.complete();
          }
        });
    });
  }

  deleteTipoCirugia(id: string): Observable<void> {
    return new Observable(observer => {
      // Soft delete - marcar como inactivo
      this.supabase.client
        .from('tipos_cirugia')
        .update({ es_activo: false })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next();
            observer.complete();
          }
        });
    });
  }

  getProductosComunes(tipoId: string): Observable<Producto[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('tipos_cirugia')
        .select('productos_comunes')
        .eq('id', tipoId)
        .single()
        .then(async ({ data, error }) => {
          if (error) {
            observer.error(error);
          } else if (data?.productos_comunes && Array.isArray(data.productos_comunes)) {
            // Obtener los productos por sus IDs
            const { data: productos, error: prodError } = await this.supabase.client
              .from('productos')
              .select('*')
              .in('id', data.productos_comunes);
            
            if (prodError) {
              observer.error(prodError);
            } else {
              observer.next(productos || []);
              observer.complete();
            }
          } else {
            observer.next([]);
            observer.complete();
          }
        });
    });
  }

  getTiposCirugiaPorEspecialidad(especialidad: string): Observable<TipoCirugia[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('tipos_cirugia')
        .select('*')
        .eq('especialidad', especialidad)
        .eq('es_activo', true)
        .order('nombre', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data || []);
            observer.complete();
          }
        });
    });
  }

  getEspecialidades(): Observable<string[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('tipos_cirugia')
        .select('especialidad')
        .eq('es_activo', true)
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            // Extraer especialidades únicas
            const especialidades = [...new Set(
              data?.map(t => t.especialidad).filter(e => e) || []
            )].sort();
            observer.next(especialidades);
            observer.complete();
          }
        });
    });
  }
}