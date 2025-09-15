import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { Cirugia, CirugiaCreate } from './models';

@Injectable({
  providedIn: 'root'
})
export class CirugiasService {
  constructor(private supabase: SupabaseService) {}

  getCirugias(): Observable<Cirugia[]> {
    return from(
      this.supabase.client
        .from('cirugias')
        .select(`
          *,
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching cirugias:', response.error);
          throw new Error(response.error.message || 'Error al cargar cirugías');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error:', error);
        throw error;
      })
    );
  }

  getCirugiaById(id: string): Observable<Cirugia> {
    return from(
      this.supabase.client
        .from('cirugias')
        .select(`
          *,
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al cargar cirugía');
        }
        return response.data;
      })
    );
  }

  createCirugia(cirugia: CirugiaCreate): Observable<Cirugia> {
    return from(
      this.supabase.client
        .from('cirugias')
        .insert(cirugia)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al crear cirugía');
        }
        return response.data;
      })
    );
  }

  updateCirugia(id: string, updates: Partial<Cirugia>): Observable<Cirugia> {
    return from(
      this.supabase.client
        .from('cirugias')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al actualizar cirugía');
        }
        return response.data;
      })
    );
  }

  updateEstado(id: string, estado: string, comentario?: string): Observable<void> {
    return from(
      this.supabase.client
        .from('cirugias')
        .update({ 
          estado,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al actualizar estado');
        }
        
        // Si hay comentario, crear registro de seguimiento
        if (comentario) {
          this.createSeguimiento(id, estado, comentario).subscribe();
        }
      })
    );
  }

  getCirugiasByTecnico(tecnicoId: string): Observable<Cirugia[]> {
    return from(
      this.supabase.client
        .from('cirugias')
        .select(`
          *,
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('tecnico_asignado_id', tecnicoId)
        .order('fecha_programada', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al cargar cirugías del técnico');
        }
        return response.data || [];
      })
    );
  }

  private createSeguimiento(cirugiaId: string, estado: string, comentario: string): Observable<void> {
    return from(
      this.supabase.client
        .from('cirugia_seguimiento')
        .insert({
          cirugia_id: cirugiaId,
          estado_nuevo: estado,
          comentario,
          usuario_id: this.supabase.getCurrentUserId()
        })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error creating seguimiento:', response.error);
        }
      })
    );
  }
}