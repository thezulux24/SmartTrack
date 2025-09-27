import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { from, Observable } from 'rxjs';
import { Cirugia } from './models';

@Injectable({
  providedIn: 'root'
})
export class AgendaTecnicosService {
  private supabase = inject(SupabaseService);

  // Obtener cirugías asignadas al técnico actual
  getMyCirugias(): Observable<Cirugia[]> {
    return from(
      this.getTechnicianCirugias()
    );
  }

  private async getTechnicianCirugias(): Promise<Cirugia[]> {
    try {
      // Obtener el ID del usuario actual
      const currentUserId = await this.supabase.getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.client
        .from('cirugias')
        .select(`
          *,
          hospital_data:hospital_id(id, nombre, direccion, telefono, contacto_principal),
          tipo_cirugia_data:tipo_cirugia_id(id, nombre, descripcion, duracion_promedio),
          tecnico_asignado:tecnico_asignado_id(id, full_name, email, phone),
          usuario_creador:usuario_creador_id(id, full_name, email)
        `)
        .eq('tecnico_asignado_id', currentUserId) // Solo cirugías asignadas a este técnico
        .order('fecha_programada', { ascending: true });

      if (error) {
        console.error('Error loading technician cirugias:', error);
        throw error;
      }

      console.log('✅ Cirugías del técnico cargadas:', data);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getTechnicianCirugias:', error);
      throw error;
    }
  }

  // Obtener cirugías del técnico para un rango de fechas específico
  getMyCirugiasForDateRange(startDate: string, endDate: string): Observable<Cirugia[]> {
    return from(
      this.getTechnicianCirugiasForDateRange(startDate, endDate)
    );
  }

  private async getTechnicianCirugiasForDateRange(startDate: string, endDate: string): Promise<Cirugia[]> {
    try {
      const currentUserId = await this.supabase.getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase.client
        .from('cirugias')
        .select(`
          *,
          hospital_data:hospital_id(id, nombre, direccion, telefono, contacto_principal),
          tipo_cirugia_data:tipo_cirugia_id(id, nombre, descripcion, duracion_promedio),
          tecnico_asignado:tecnico_asignado_id(id, full_name, email, phone),
          usuario_creador:usuario_creador_id(id, full_name, email)
        `)
        .eq('tecnico_asignado_id', currentUserId)
        .gte('fecha_programada', startDate)
        .lte('fecha_programada', endDate)
        .order('fecha_programada', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting cirugias for date range:', error);
      throw error;
    }
  }

  // Obtener estadísticas del técnico
  async getTechnicianStats(): Promise<{
    totalCirugias: number;
    cirugiasPendientes: number;
    cirugiasCompletadas: number;
    cirugiasHoy: number;
  }> {
    try {
      const currentUserId = await this.supabase.getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      const today = new Date().toISOString().split('T')[0];

      // Total cirugías asignadas
      const { data: totalData, error: totalError } = await this.supabase.client
        .from('cirugias')
        .select('id', { count: 'exact' })
        .eq('tecnico_asignado_id', currentUserId);

      if (totalError) throw totalError;

      // Cirugías pendientes
      const { data: pendientesData, error: pendientesError } = await this.supabase.client
        .from('cirugias')
        .select('id', { count: 'exact' })
        .eq('tecnico_asignado_id', currentUserId)
        .in('estado', ['programada', 'en_curso']);

      if (pendientesError) throw pendientesError;

      // Cirugías completadas
      const { data: completadasData, error: completadasError } = await this.supabase.client
        .from('cirugias')
        .select('id', { count: 'exact' })
        .eq('tecnico_asignado_id', currentUserId)
        .eq('estado', 'completada');

      if (completadasError) throw completadasError;

      // Cirugías de hoy
      const { data: hoyData, error: hoyError } = await this.supabase.client
        .from('cirugias')
        .select('id', { count: 'exact' })
        .eq('tecnico_asignado_id', currentUserId)
        .gte('fecha_programada', today)
        .lt('fecha_programada', `${today}T23:59:59`);

      if (hoyError) throw hoyError;

      return {
        totalCirugias: totalData?.length || 0,
        cirugiasPendientes: pendientesData?.length || 0,
        cirugiasCompletadas: completadasData?.length || 0,
        cirugiasHoy: hoyData?.length || 0
      };
    } catch (error) {
      console.error('❌ Error getting technician stats:', error);
      return {
        totalCirugias: 0,
        cirugiasPendientes: 0,
        cirugiasCompletadas: 0,
        cirugiasHoy: 0
      };
    }
  }

  // Marcar cirugía como completada (si el técnico tiene permisos)
  async markCirugiaAsCompleted(cirugiaId: string): Promise<void> {
    try {
      const currentUserId = await this.supabase.getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar que la cirugía esté asignada al técnico actual
      const { data: cirugia, error: checkError } = await this.supabase.client
        .from('cirugias')
        .select('id, tecnico_asignado_id')
        .eq('id', cirugiaId)
        .eq('tecnico_asignado_id', currentUserId)
        .single();

      if (checkError || !cirugia) {
        throw new Error('No tienes permisos para modificar esta cirugía');
      }

      // Actualizar el estado
      const { error } = await this.supabase.client
        .from('cirugias')
        .update({ 
          estado: 'completada',
          updated_at: new Date().toISOString(),
          updated_by: currentUserId
        })
        .eq('id', cirugiaId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error marking cirugia as completed:', error);
      throw error;
    }
  }

  // Agregar notas del técnico a una cirugía
  async addTechnicianNotes(cirugiaId: string, notes: string): Promise<void> {
    try {
      const currentUserId = await this.supabase.getCurrentUserId();
      
      if (!currentUserId) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar que la cirugía esté asignada al técnico actual
      const { data: cirugia, error: checkError } = await this.supabase.client
        .from('cirugias')
        .select('id, tecnico_asignado_id, notas')
        .eq('id', cirugiaId)
        .eq('tecnico_asignado_id', currentUserId)
        .single();

      if (checkError || !cirugia) {
        throw new Error('No tienes permisos para modificar esta cirugía');
      }

      // Agregar las notas del técnico a las notas existentes
      const existingNotes = cirugia.notas || '';
      const technicianNote = `[Técnico - ${new Date().toLocaleDateString()}]: ${notes}`;
      const updatedNotes = existingNotes ? `${existingNotes}\n\n${technicianNote}` : technicianNote;

      const { error } = await this.supabase.client
        .from('cirugias')
        .update({ 
          notas: updatedNotes,
          updated_at: new Date().toISOString(),
          updated_by: currentUserId
        })
        .eq('id', cirugiaId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error adding technician notes:', error);
      throw error;
    }
  }
}