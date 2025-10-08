import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../data-access/supabase.service';
import { Mensajero, Envio, AsignacionEnvioDTO } from '../models/envio.model';

@Injectable({
  providedIn: 'root'
})
export class EnvioService {
  private supabase = inject(SupabaseService);

  /**
   * Obtener mensajeros activos y disponibles
   */
  getMensajerosDisponibles(): Observable<Mensajero[]> {
    return from(
      this.supabase.client
        .from('mensajeros')
        .select('*')
        .eq('estado', 'disponible')
        .order('nombre')
    ).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Asignar mensajero a un kit y crear envío
   */
  async asignarMensajero(datos: AsignacionEnvioDTO): Promise<{ exito: boolean; envio?: Envio; mensaje?: string }> {
    try {
      // 1. Crear el envío
      const { data: envioData, error: envioError } = await this.supabase.client
        .from('envios')
        .insert({
          kit_id: datos.kit_id,
          mensajero_id: datos.mensajero_id,
          direccion_destino: datos.direccion_destino,
          contacto_destino: datos.contacto_destino,
          telefono_destino: datos.telefono_destino,
          fecha_programada: datos.fecha_programada,
          observaciones: datos.observaciones,
          estado: 'programado'
        })
        .select()
        .single();

      if (envioError) {
        console.error('Error creando envío:', envioError);
        return { exito: false, mensaje: 'Error al crear el envío' };
      }

      // 2. Actualizar el kit a estado 'en_transito'
      const { error: kitError } = await this.supabase.client
        .from('kits_cirugia')
        .update({
          estado: 'en_transito',
          fecha_envio: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', datos.kit_id);

      if (kitError) {
        console.error('Error actualizando kit:', kitError);
        return { exito: false, mensaje: 'Error al actualizar el estado del kit' };
      }

      // 3. Registrar en trazabilidad
      await this.supabase.client
        .from('kit_trazabilidad')
        .insert({
          kit_id: datos.kit_id,
          accion: 'Asignado a mensajero para envío',
          estado_anterior: 'listo_envio',
          estado_nuevo: 'en_transito',
          usuario_id: (await this.supabase.client.auth.getUser()).data.user?.id,
          timestamp: new Date().toISOString(),
          observaciones: `Mensajero asignado para envío.`,
          metadata: {
            envio_id: envioData.id,
            mensajero_id: datos.mensajero_id
          }
        });

      return {
        exito: true,
        envio: envioData,
        mensaje: `Envío creado exitosamente`
      };

    } catch (error) {
      console.error('Error en asignación de mensajero:', error);
      return { exito: false, mensaje: 'Error al procesar la asignación' };
    }
  }

  /**
   * Obtener kits listos para envío (estado listo_envio)
   */
  getKitsListosParaEnvio(): Observable<any[]> {
    return from(
      this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugias!inner(
            numero_cirugia,
            fecha_programada,
            medico_cirujano,
            hospitales(
              nombre,
              direccion,
              ciudad,
              contacto_principal,
              telefono
            ),
            clientes(
              nombre,
              apellido,
              telefono
            )
          )
        `)
        .eq('estado', 'listo_envio')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        const kits = response.data || [];
        // Transformar la respuesta para mantener compatibilidad
        const transformedKits = kits.map((kit: any) => ({
          ...kit,
          cirugia: kit.cirugias
        }));
        
        // Ordenar por fecha de cirugía en el cliente
        return transformedKits.sort((a: any, b: any) => {
          const fechaA = a.cirugia?.fecha_programada ? new Date(a.cirugia.fecha_programada).getTime() : 0;
          const fechaB = b.cirugia?.fecha_programada ? new Date(b.cirugia.fecha_programada).getTime() : 0;
          return fechaA - fechaB;
        });
      })
    );
  }

  /**
   * Obtener envíos activos (programados y en tránsito)
   */
  getEnviosActivos(): Observable<Envio[]> {
    return from(
      this.supabase.client
        .from('envios')
        .select(`
          id,
          kit_id,
          mensajero_id,
          direccion_destino,
          contacto_destino,
          telefono_destino,
          fecha_programada,
          hora_salida,
          hora_llegada,
          estado,
          observaciones,
          created_at,
          kits_cirugia (
            id,
            numero_kit,
            qr_code,
            cirugia_id,
            cirugias (
              numero_cirugia,
              hospital_id,
              hospitales (
                nombre
              )
            )
          ),
          mensajeros (
            nombre,
            telefono,
            placa
          )
        `)
        .in('estado', ['programado', 'en_transito'])
        .order('fecha_programada', { ascending: true })
    ).pipe(
      map(response => {
        if (!response.data) return [];
        
        // Transformar la respuesta para que coincida con el modelo Envio
        return response.data.map((envio: any) => ({
          ...envio,
          kit: {
            id: envio.kits_cirugia?.id,
            numero_kit: envio.kits_cirugia?.numero_kit,
            codigo_qr: envio.kits_cirugia?.qr_code, // Mapear qr_code a codigo_qr
            cirugia: {
              numero_cirugia: envio.kits_cirugia?.cirugias?.numero_cirugia,
              hospital: {
                nombre: envio.kits_cirugia?.cirugias?.hospitales?.nombre
              }
            }
          },
          mensajero: {
            nombre: envio.mensajeros?.nombre,
            telefono: envio.mensajeros?.telefono,
            placa: envio.mensajeros?.placa
          }
        }));
      })
    );
  }

  /**
   * Iniciar envío (mensajero sale con el kit)
   */
  async iniciarEnvio(envioId: string): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      // 1. Obtener datos del envío
      const { data: envio, error: envioError } = await this.supabase.client
        .from('envios')
        .select('kit_id, mensajero_id')
        .eq('id', envioId)
        .single();

      if (envioError) throw envioError;

      // 2. Actualizar envío a en_transito
      const { error: updateError } = await this.supabase.client
        .from('envios')
        .update({
          estado: 'en_transito',
          hora_salida: new Date().toISOString()
        })
        .eq('id', envioId);

      if (updateError) throw updateError;

      // 3. Registrar en trazabilidad
      await this.supabase.client
        .from('kit_trazabilidad')
        .insert({
          kit_id: envio.kit_id,
          accion: 'Envío iniciado - Mensajero en ruta',
          estado_anterior: 'en_transito',
          estado_nuevo: 'en_transito',
          usuario_id: (await this.supabase.client.auth.getUser()).data.user?.id,
          timestamp: new Date().toISOString(),
          observaciones: 'Mensajero ha iniciado el trayecto hacia el destino',
          metadata: {
            envio_id: envioId,
            mensajero_id: envio.mensajero_id
          }
        });

      return { exito: true, mensaje: 'Envío iniciado exitosamente' };
    } catch (error) {
      console.error('Error iniciando envío:', error);
      return { exito: false, mensaje: 'Error al iniciar el envío' };
    }
  }

  /**
   * Confirmar entrega (llamado desde QR público)
   */
  async confirmarEntrega(envioId: string, datosEntrega: {
    nombre_receptor: string;
    documento_receptor?: string;
  }): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      // 1. Obtener datos del envío
      const { data: envio, error: envioError } = await this.supabase.client
        .from('envios')
        .select('kit_id, mensajero_id')
        .eq('id', envioId)
        .single();

      if (envioError) throw envioError;

      // 2. Actualizar envío a entregado
      const { error: updateEnvioError } = await this.supabase.client
        .from('envios')
        .update({
          estado: 'entregado',
          hora_llegada: new Date().toISOString()
        })
        .eq('id', envioId);

      if (updateEnvioError) throw updateEnvioError;

      // 3. Actualizar kit a entregado
      const { error: updateKitError } = await this.supabase.client
        .from('kits_cirugia')
        .update({
          estado: 'entregado',
          updated_at: new Date().toISOString()
        })
        .eq('id', envio.kit_id);

      if (updateKitError) throw updateKitError;

      // 4. Registrar en trazabilidad
      await this.supabase.client
        .from('kit_trazabilidad')
        .insert({
          kit_id: envio.kit_id,
          accion: 'Kit entregado al cliente',
          estado_anterior: 'en_transito',
          estado_nuevo: 'entregado',
          usuario_id: (await this.supabase.client.auth.getUser()).data.user?.id,
          timestamp: new Date().toISOString(),
          observaciones: `Recibido por: ${datosEntrega.nombre_receptor}${datosEntrega.documento_receptor ? ` - Doc: ${datosEntrega.documento_receptor}` : ''}`,
          metadata: {
            envio_id: envioId,
            mensajero_id: envio.mensajero_id,
            receptor: datosEntrega
          }
        });

      return { exito: true, mensaje: 'Entrega confirmada exitosamente' };
    } catch (error) {
      console.error('Error confirmando entrega:', error);
      return { exito: false, mensaje: 'Error al confirmar la entrega' };
    }
  }
}
