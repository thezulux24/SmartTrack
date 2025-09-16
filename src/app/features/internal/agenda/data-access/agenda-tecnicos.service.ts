import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { AgendaTecnico, AgendaTecnicoCreate, Profile } from './models';

@Injectable({
  providedIn: 'root'
})
export class AgendaTecnicosService {
  constructor(private supabase: SupabaseService) {}

  getAgendaTecnicos(): Observable<AgendaTecnico[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('agenda_tecnicos')
        .select(`
          *,
          tecnico:profiles(full_name, email, phone)
        `)
        .order('fecha', { ascending: true })
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

  getAgendaPorTecnico(tecnicoId: string, fechaInicio?: string, fechaFin?: string): Observable<AgendaTecnico[]> {
    return new Observable(observer => {
      let query = this.supabase.client
        .from('agenda_tecnicos')
        .select('*')
        .eq('tecnico_id', tecnicoId);

      if (fechaInicio) {
        query = query.gte('fecha', fechaInicio);
      }
      if (fechaFin) {
        query = query.lte('fecha', fechaFin);
      }

      query
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
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

  getAgendaPorFecha(fecha: string): Observable<AgendaTecnico[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('agenda_tecnicos')
        .select(`
          *,
          tecnico:profiles(full_name, email)
        `)
        .eq('fecha', fecha)
        .order('hora_inicio', { ascending: true })
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

  createDisponibilidad(agenda: AgendaTecnicoCreate): Observable<AgendaTecnico> {
    return new Observable(observer => {
      this.supabase.client
        .from('agenda_tecnicos')
        .insert(agenda)
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

  updateDisponibilidad(id: string, updates: Partial<AgendaTecnico>): Observable<AgendaTecnico> {
    return new Observable(observer => {
      this.supabase.client
        .from('agenda_tecnicos')
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

  deleteDisponibilidad(id: string): Observable<void> {
    return new Observable(observer => {
      this.supabase.client
        .from('agenda_tecnicos')
        .delete()
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

  getTecnicosDisponibles(fecha: string, horaInicio: string, horaFin: string): Observable<Profile[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('agenda_tecnicos')
        .select(`
          tecnico_id,
          tecnico:profiles(*)
        `)
        .eq('fecha', fecha)
        .eq('disponible', true)
        .lte('hora_inicio', horaInicio)
        .gte('hora_fin', horaFin)
        .then(({ data, error }) => {
          if (error) {
            observer.error(error);
          } else {
            const tecnicos = (data?.map(item => {
              const t = item?.tecnico;
              if (Array.isArray(t)) return t[0] ?? null;
              return t ?? null;
            }).filter((t): t is Profile => !!t) as Profile[]) || [];
            observer.next(tecnicos);
            observer.complete();
          }
        });
    });
  }

  marcarNoDisponible(tecnicoId: string, fecha: string, motivo: string): Observable<void> {
    return new Observable(observer => {
      this.supabase.client
        .from('agenda_tecnicos')
        .update({ 
          disponible: false, 
          motivo_no_disponible: motivo 
        })
        .eq('tecnico_id', tecnicoId)
        .eq('fecha', fecha)
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

  getTecnicosSoporteTecnico(): Observable<Profile[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('profiles')
        .select('*')
        .eq('role', 'soporte_tecnico')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
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


  
}