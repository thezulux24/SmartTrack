import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, switchMap } from 'rxjs';
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
          cliente:clientes!cirugias_cliente_id_fkey(
            id,
            nombre,
            apellido,
            documento_tipo,
            documento_numero,
            telefono,
            email,
            ciudad
          ),
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name,
            email,
            area
          ),
          hospital_data:hospitales!cirugias_hospital_id_fkey(
            id,
            nombre,
            direccion,
            ciudad,
            telefono,
            contacto_principal
          ),
          tipo_cirugia_data:tipos_cirugia!cirugias_tipo_cirugia_id_fkey(
            id,
            nombre,
            descripcion,
            duracion_promedio,
            especialidad
          )
        `)
        .order('fecha_programada', { ascending: true })
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
        return throwError(() => error);
      })
    );
  }

  getCirugiaById(id: string): Observable<Cirugia> {
    return from(
      this.supabase.client
        .from('cirugias')
        .select(`
          *,
          cliente:clientes!cirugias_cliente_id_fkey(
            id,
            nombre,
            apellido,
            documento_tipo,
            documento_numero,
            telefono,
            email,
            ciudad
          ),
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name,
            email,
            area
          ),
          hospital_data:hospitales!cirugias_hospital_id_fkey(
            id,
            nombre,
            direccion,
            ciudad,
            telefono,
            contacto_principal
          ),
          tipo_cirugia_data:tipos_cirugia!cirugias_tipo_cirugia_id_fkey(
            id,
            nombre,
            descripcion,
            duracion_promedio,
            especialidad
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
      }),
      catchError(error => {
        console.error('Error loading cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  createCirugia(cirugia: CirugiaCreate): Observable<Cirugia> {
    return from(this.supabase.client.auth.getUser()).pipe(
      switchMap(userResponse => {
        const user = userResponse.data.user;
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        const cirugiaData = {
          ...cirugia,
          usuario_creador_id: user.id
        };

        return from(
          this.supabase.client
            .from('cirugias')
            .insert([cirugiaData])
            .select(`
              *,
              tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
                id,
                full_name,
                email
              ),
              hospital_data:hospitales!cirugias_hospital_id_fkey(
                id,
                nombre,
                ciudad
              ),
              tipo_cirugia_data:tipos_cirugia!cirugias_tipo_cirugia_id_fkey(
                id,
                nombre
              )
            `)
            .single()
        );
      }),
      map(response => {
        if (response.error) {
          console.error('Error creating cirugia:', response.error);
          throw new Error(response.error.message || 'Error al crear cirugía');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error creating cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  updateCirugia(id: string, updates: Partial<Cirugia>): Observable<Cirugia> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    return from(
      this.supabase.client
        .from('cirugias')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name,
            email
          ),
          hospital_data:hospitales!cirugias_hospital_id_fkey(
            id,
            nombre,
            ciudad
          ),
          tipo_cirugia_data:tipos_cirugia!cirugias_tipo_cirugia_id_fkey(
            id,
            nombre
          )
        `)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error updating cirugia:', response.error);
          throw new Error(response.error.message || 'Error al actualizar cirugía');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Service error updating cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  updateEstado(id: string, estado: string, comentario?: string): Observable<void> {
    return from(this.supabase.client.auth.getUser()).pipe(
      switchMap(userResponse => {
        const user = userResponse.data.user;
        
        // Primero obtenemos el estado anterior
        return from(
          this.supabase.client
            .from('cirugias')
            .select('estado')
            .eq('id', id)
            .single()
        ).pipe(
          switchMap(currentResponse => {
            if (currentResponse.error) {
              throw new Error('Error al obtener estado actual');
            }

            const estadoAnterior = currentResponse.data.estado;

            // Actualizamos el estado
            return from(
              this.supabase.client
                .from('cirugias')
                .update({
                  estado,
                  updated_at: new Date().toISOString()
                })
                .eq('id', id)
            ).pipe(
              switchMap(updateResponse => {
                if (updateResponse.error) {
                  throw new Error('Error al actualizar estado');
                }

                // Creamos el registro de seguimiento
                return from(
                  this.supabase.client
                    .from('cirugia_seguimiento')
                    .insert([{
                      cirugia_id: id,
                      estado_anterior: estadoAnterior,
                      estado_nuevo: estado,
                      comentario: comentario || `Estado cambiado a ${estado}`,
                      usuario_id: user?.id || null
                    }])
                );
              })
            );
          })
        );
      }),
      map(response => {
        if (response.error) {
          console.error('Error updating estado:', response.error);
          throw new Error(response.error.message || 'Error al actualizar estado');
        }
      }),
      catchError(error => {
        console.error('Service error updating estado:', error);
        return throwError(() => error);
      })
    );
  }

  deleteCirugia(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('cirugias')
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error deleting cirugia:', response.error);
          throw new Error(response.error.message || 'Error al eliminar cirugía');
        }
      }),
      catchError(error => {
        console.error('Service error deleting cirugia:', error);
        return throwError(() => error);
      })
    );
  }

  getCirugiasByTecnico(tecnicoId: string): Observable<Cirugia[]> {
    return from(
      this.supabase.client
        .from('cirugias')
        .select(`
          *,
          hospital_data:hospitales!cirugias_hospital_id_fkey(
            id,
            nombre,
            ciudad
          ),
          tipo_cirugia_data:tipos_cirugia!cirugias_tipo_cirugia_id_fkey(
            id,
            nombre
          )
        `)
        .eq('tecnico_asignado_id', tecnicoId)
        .order('fecha_programada', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching cirugias by tecnico:', response.error);
          throw new Error(response.error.message || 'Error al cargar cirugías del técnico');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading tecnico cirugias:', error);
        return throwError(() => error);
      })
    );
  }

  getCirugiasByDateRange(fechaInicio: string, fechaFin: string): Observable<Cirugia[]> {
    return from(
      this.supabase.client
        .from('cirugias')
        .select(`
          *,
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name,
            email
          ),
          hospital_data:hospitales!cirugias_hospital_id_fkey(
            id,
            nombre,
            ciudad
          ),
          tipo_cirugia_data:tipos_cirugia!cirugias_tipo_cirugia_id_fkey(
            id,
            nombre
          )
        `)
        .gte('fecha_programada', fechaInicio)
        .lte('fecha_programada', fechaFin)
        .order('fecha_programada', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching cirugias by date range:', response.error);
          throw new Error(response.error.message || 'Error al cargar cirugías por fecha');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading date range cirugias:', error);
        return throwError(() => error);
      })
    );
  }

  getSeguimientoCirugia(cirugiaId: string): Observable<any[]> {
    return from(
      this.supabase.client
        .from('cirugia_seguimiento')
        .select(`
          *,
          usuario:profiles!cirugia_seguimiento_usuario_id_fkey(
            id,
            full_name
          )
        `)
        .eq('cirugia_id', cirugiaId)
        .order('fecha_cambio', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Error fetching seguimiento:', response.error);
          throw new Error(response.error.message || 'Error al cargar seguimiento');
        }
        return response.data || [];
      }),
      catchError(error => {
        console.error('Service error loading seguimiento:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para obtener estadísticas/KPIs
  getCirugiaStats(): Observable<any> {
    return from(
      this.supabase.client
        .from('cirugias')
        .select('estado, prioridad, fecha_programada, tecnico_asignado_id')
    ).pipe(
      map(response => {
        if (response.error) {
          throw new Error(response.error.message || 'Error al cargar estadísticas');
        }
        
        const data = response.data || [];
        const hoy = new Date();
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);

        return {
          total: data.length,
          programadas: data.filter(c => c.estado === 'programada').length,
          en_curso: data.filter(c => c.estado === 'en_curso').length,
          completadas: data.filter(c => c.estado === 'completada').length,
          canceladas: data.filter(c => c.estado === 'cancelada').length,
          urgencias: data.filter(c => c.estado === 'urgencia' || c.prioridad === 'urgencia').length,
          sin_tecnico: data.filter(c => !c.tecnico_asignado_id && c.estado === 'programada').length,
          hoy: data.filter(c => {
            const fechaCirugia = new Date(c.fecha_programada).toDateString();
            return fechaCirugia === hoy.toDateString();
          }).length,
          manana: data.filter(c => {
            const fechaCirugia = new Date(c.fecha_programada).toDateString();
            return fechaCirugia === manana.toDateString();
          }).length
        };
      }),
      catchError(error => {
        console.error('Service error loading stats:', error);
        return throwError(() => error);
      })
    );
  }
}