import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { TipoCirugia, TipoCirugiaCreate } from './models';

@Injectable({
  providedIn: 'root'
})
export class TiposCirugiaService {
  constructor(private supabase: SupabaseService) {}

  getTiposCirugia(): Observable<TipoCirugia[]> {
    return from(
      this.supabase.client
        .from('tipos_cirugia')
        .select('*')
        .eq('es_activo', true)
        .order('nombre', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching tipos cirugia:', response.error);
          throw new Error(response.error.message || 'Error al cargar tipos de cirugía');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading tipos cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  getTipoCirugiaById(id: string): Observable<TipoCirugia> {
    return from(
      this.supabase.client
        .from('tipos_cirugia')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al cargar tipo de cirugía');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error loading tipo cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  createTipoCirugia(tipo: TipoCirugiaCreate): Observable<TipoCirugia> {
    return from(
      this.supabase.client
        .from('tipos_cirugia')
        .insert([tipo])
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error creating tipo cirugia:', response.error);
          throw new Error(response.error.message || 'Error al crear tipo de cirugía');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error creating tipo cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  updateTipoCirugia(id: string, updates: Partial<TipoCirugia>): Observable<TipoCirugia> {
    return from(
      this.supabase.client
        .from('tipos_cirugia')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error updating tipo cirugia:', response.error);
          throw new Error(response.error.message || 'Error al actualizar tipo de cirugía');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error updating tipo cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  deleteTipoCirugia(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('tipos_cirugia')
        .update({ es_activo: false })
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error deleting tipo cirugia:', response.error);
          throw new Error(response.error.message || 'Error al eliminar tipo de cirugía');
        }
      }),
      catchError(error => {
        console.error('Service error deleting tipo cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  getTiposByEspecialidad(especialidad: string): Observable<TipoCirugia[]> {
    return from(
      this.supabase.client
        .from('tipos_cirugia')
        .select('*')
        .eq('especialidad', especialidad)
        .eq('es_activo', true)
        .order('nombre', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching tipos by especialidad:', response.error);
          throw new Error(response.error.message || 'Error al cargar tipos por especialidad');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading tipos by especialidad:', error);
        return throwError(() => error);
      })
    );
  }

  getEspecialidades(): Observable<string[]> {
    return from(
      this.supabase.client
        .from('tipos_cirugia')
        .select('especialidad')
        .eq('es_activo', true)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching especialidades:', response.error);
          throw new Error(response.error.message || 'Error al cargar especialidades');
        }
        // Extraer especialidades únicas
        const especialidades = [...new Set(
          response.data?.map(t => t.especialidad).filter(e => e) || []
        )].sort();
        return especialidades;
      }),
      catchError(error => {
        console.error('Service error loading especialidades:', error);
        return throwError(() => error);
      })
    );
  }
}