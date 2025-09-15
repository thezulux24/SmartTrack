import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { Hospital, HospitalCreate } from './models';

@Injectable({
  providedIn: 'root'
})
export class HospitalesService {
  constructor(private supabase: SupabaseService) {}

  getHospitales(): Observable<Hospital[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('hospitales')
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

  getHospitalById(id: string): Observable<Hospital> {
    return new Observable(observer => {
      this.supabase.client
        .from('hospitales')
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

  createHospital(hospital: HospitalCreate): Observable<Hospital> {
    return new Observable(observer => {
      this.supabase.client
        .from('hospitales')
        .insert(hospital)
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

  updateHospital(id: string, updates: Partial<Hospital>): Observable<Hospital> {
    return new Observable(observer => {
      this.supabase.client
        .from('hospitales')
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

  deleteHospital(id: string): Observable<void> {
    return new Observable(observer => {
      // Soft delete - marcar como inactivo
      this.supabase.client
        .from('hospitales')
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

  getHospitalesByCiudad(ciudad: string): Observable<Hospital[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('hospitales')
        .select('*')
        .eq('ciudad', ciudad)
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

  getCiudades(): Observable<string[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('hospitales')
        .select('ciudad')
        .eq('es_activo', true)
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            // Extraer ciudades únicas
            const ciudades = [...new Set(
              data?.map(h => h.ciudad).filter(c => c) || []
            )].sort();
            observer.next(ciudades);
            observer.complete();
          }
        });
    });
  }
}