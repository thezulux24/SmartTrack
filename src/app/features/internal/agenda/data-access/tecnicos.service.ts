import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { TecnicoAsignado } from './models';

@Injectable({
  providedIn: 'root'
})
export class TecnicosService {
  constructor(private supabase: SupabaseService) {}

  getTecnicos(): Observable<TecnicoAsignado[]> {
    return from(
      this.supabase.client
        .from('profiles')
        .select('id, full_name, email, area, phone')
        .eq('role', 'soporte_tecnico')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching tecnicos:', response.error);
          throw new Error(response.error.message || 'Error al cargar técnicos');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading tecnicos:', error);
        return throwError(() => error);
      })
    );
  }

  getTecnicoById(id: string): Observable<TecnicoAsignado> {
    return from(
      this.supabase.client
        .from('profiles')
        .select('id, full_name, email, area, phone')
        .eq('id', id)
        .eq('role', 'soporte_tecnico')
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al cargar técnico');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error loading tecnico:', error);
        return throwError(() => error);
      })
    );
  }

  getTecnicosDisponibles(fecha: string): Observable<TecnicoAsignado[]> {
    return from(
      this.supabase.client
        .from('profiles')
        .select(`
          id, 
          full_name, 
          email, 
          area,
          agenda_tecnicos!inner(*)
        `)
        .eq('role', 'soporte_tecnico')
        .eq('is_active', true)
        .eq('agenda_tecnicos.fecha', fecha)
        .eq('agenda_tecnicos.disponible', true)
        .order('full_name', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching tecnicos disponibles:', response.error);
          throw new Error(response.error.message || 'Error al cargar técnicos disponibles');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading tecnicos disponibles:', error);
        return throwError(() => error);
      })
    );
  }
}