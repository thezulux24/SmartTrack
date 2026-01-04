import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { Hospital, HospitalCreate } from './models';

@Injectable({
  providedIn: 'root'
})
export class HospitalesService {
  constructor(private supabase: SupabaseService) {}

  getHospitales(): Observable<Hospital[]> {
    return from(
      this.supabase.client
        .from('hospitales')
        .select('*')
        .eq('es_activo', true)
        .order('nombre', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching hospitales:', response.error);
          throw new Error(response.error.message || 'Error al cargar hospitales');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading hospitales:', error);
        return throwError(() => error);
      })
    );
  }

  getHospitalById(id: string): Observable<Hospital> {
    return from(
      this.supabase.client
        .from('hospitales')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al cargar hospital');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error loading hospital:', error);
        return throwError(() => error);
      })
    );
  }

  createHospital(hospital: HospitalCreate): Observable<Hospital> {
    return from(
      this.supabase.client
        .from('hospitales')
        .insert([hospital])
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error creating hospital:', response.error);
          throw new Error(response.error.message || 'Error al crear hospital');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error creating hospital:', error);
        return throwError(() => error);
      })
    );
  }

  updateHospital(id: string, updates: Partial<Hospital>): Observable<Hospital> {
    return from(
      this.supabase.client
        .from('hospitales')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error updating hospital:', response.error);
          throw new Error(response.error.message || 'Error al actualizar hospital');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error updating hospital:', error);
        return throwError(() => error);
      })
    );
  }

  deleteHospital(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('hospitales')
        .update({ es_activo: false })
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error deleting hospital:', response.error);
          throw new Error(response.error.message || 'Error al eliminar hospital');
        }
      }),
      catchError(error => {
        console.error('Service error deleting hospital:', error);
        return throwError(() => error);
      })
    );
  }

  getHospitalesByCiudad(ciudad: string): Observable<Hospital[]> {
    return from(
      this.supabase.client
        .from('hospitales')
        .select('*')
        .eq('ciudad', ciudad)
        .eq('es_activo', true)
        .order('nombre', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching hospitales by ciudad:', response.error);
          throw new Error(response.error.message || 'Error al cargar hospitales por ciudad');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading hospitales by ciudad:', error);
        return throwError(() => error);
      })
    );
  }

  getCiudades(): Observable<string[]> {
    return from(
      this.supabase.client
        .from('hospitales')
        .select('ciudad')
        .eq('es_activo', true)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching ciudades:', response.error);
          throw new Error(response.error.message || 'Error al cargar ciudades');
        }
        // Extraer ciudades únicas
        const ciudades = [...new Set(
          response.data?.map(h => h.ciudad).filter(c => c) || []
        )].sort();
        return ciudades;
      }),
      catchError(error => {
        console.error('Service error loading ciudades:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ Métodos adicionales útiles
  searchHospitales(searchTerm: string): Observable<Hospital[]> {
    return from(
      this.supabase.client
        .from('hospitales')
        .select('*')
        .eq('es_activo', true)
        .or(`nombre.ilike.%${searchTerm}%,ciudad.ilike.%${searchTerm}%,direccion.ilike.%${searchTerm}%`)
        .order('nombre', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error searching hospitales:', response.error);
          throw new Error(response.error.message || 'Error al buscar hospitales');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error searching hospitales:', error);
        return throwError(() => error);
      })
    );
  }

  getHospitalStats(): Observable<any> {
    return from(
      this.supabase.client
        .from('hospitales')
        .select('ciudad, es_activo')
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al cargar estadísticas');
        }
        
        const data = response.data || [];
        const activos = data.filter(h => h.es_activo);
        
        return {
          total: data.length,
          activos: activos.length,
          inactivos: data.length - activos.length,
          ciudades: [...new Set(activos.map(h => h.ciudad).filter(c => c))].length
        };
      }),
      catchError(error => {
        console.error('Service error loading hospital stats:', error);
        return throwError(() => error);
      })
    );
  }
}