import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { EnvioService } from '../../../shared/services/envio.service';

@Injectable({
  providedIn: 'root'
})
export class QrValidacionService {
  private supabase = inject(SupabaseService);
  private envioService = inject(EnvioService);

  /**
   * Valida que el código QR sea válido y obtiene los datos del kit
   */
  async validarQR(codigo: string): Promise<any> {
    try {
      // 1. Buscar el código QR
      const { data: qrData, error: qrError } = await this.supabase.client
        .from('qr_codes')
        .select('*')
        .eq('codigo', codigo)
        .eq('es_activo', true)
        .single();

      if (qrError || !qrData) {
        return {
          valido: false,
          mensaje: 'Código QR no encontrado o inválido'
        };
      }

      // 2. Verificar si ya fue validado para entrega
      const { data: escaneoExistente } = await this.supabase.client
        .from('qr_escaneos')
        .select('*')
        .eq('qr_code_id', qrData.id)
        .eq('tipo_accion', 'entrega_kit')
        .maybeSingle();

      if (escaneoExistente) {
        return {
          valido: false,
          mensaje: 'Este QR ya fue utilizado para validar la entrega'
        };
      }

      // 3. Obtener datos del kit con productos
      const { data: kitData, error: kitError } = await this.supabase.client
        .from('kits_cirugia')
        .select(`
          *,
          cirugia:cirugias(
            numero_cirugia,
            fecha_programada,
            medico_cirujano,
            cliente:clientes(nombre, apellido, documento_numero),
            hospital:hospitales(nombre, direccion, ciudad)
          )
        `)
        .eq('id', qrData.kit_id)
        .single();

      if (kitError || !kitData) {
        return {
          valido: false,
          mensaje: 'No se encontró el kit asociado al QR'
        };
      }

      // 4. Verificar que el kit esté en estado listo_envio o en_transito
      if (!['listo_envio', 'en_transito'].includes(kitData.estado)) {
        return {
          valido: false,
          mensaje: `El kit no está disponible para entrega (estado actual: ${kitData.estado})`
        };
      }

      // 5. Obtener productos del kit
      const { data: productosData } = await this.supabase.client
        .from('kit_productos')
        .select(`
          *,
          producto:productos(
            nombre,
            codigo,
            categoria
          )
        `)
        .eq('kit_id', kitData.id);

      return {
        valido: true,
        kit: kitData,
        productos: productosData || [],
        qr: qrData
      };

    } catch (error) {
      console.error('Error validando QR:', error);
      return {
        valido: false,
        mensaje: 'Error al validar el código QR'
      };
    }
  }

  /**
   * Registra la recepción del kit por parte del cliente
   */
  async registrarRecepcion(datos: {
    codigo_qr: string;
    kit_id: string;
    nombre_receptor: string;
    cedula_receptor: string;
    observaciones?: string;
    firma_digital: string;
  }): Promise<any> {
    try {
      // 1. Obtener el QR code
      const { data: qrData, error: qrError } = await this.supabase.client
        .from('qr_codes')
        .select('*')
        .eq('codigo', datos.codigo_qr)
        .single();

      if (qrError || !qrData) {
        return { exito: false, mensaje: 'Código QR no encontrado' };
      }

      // 2. Obtener ubicación (si está disponible)
      let ubicacion = null;
      let coordenadas_lat = null;
      let coordenadas_lng = null;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          coordenadas_lat = position.coords.latitude;
          coordenadas_lng = position.coords.longitude;
          ubicacion = `${coordenadas_lat}, ${coordenadas_lng}`;
        } catch (geoError) {
          console.log('No se pudo obtener ubicación:', geoError);
        }
      }

      const ahora = new Date().toISOString();

      // 3. Crear el escaneo de QR
      const { data: escaneoData, error: escaneoError } = await this.supabase.client
        .from('qr_escaneos')
        .insert({
          qr_code_id: qrData.id,
          kit_id: datos.kit_id,
          fecha_escaneo: ahora,
          tipo_accion: 'entrega_kit',
          resultado: 'exitoso',
          validado_por_nombre: datos.nombre_receptor,
          firma_digital: datos.firma_digital,
          ubicacion: ubicacion,
          coordenadas_lat: coordenadas_lat,
          coordenadas_lng: coordenadas_lng,
          observaciones: datos.observaciones,
          accion_realizada: 'Validación de entrega por cliente'
        })
        .select()
        .single();

      if (escaneoError) {
        console.error('Error creando escaneo:', escaneoError);
        return { exito: false, mensaje: 'Error al registrar el escaneo' };
      }

      // 4. Buscar el envío asociado al kit
      const { data: envioData } = await this.supabase.client
        .from('envios')
        .select('id')
        .eq('kit_id', datos.kit_id)
        .in('estado', ['programado', 'en_transito'])
        .maybeSingle();

      // 5. Si existe un envío activo, confirmarlo (esto actualiza kit y registra trazabilidad)
      if (envioData) {
        const resultadoEntrega = await this.envioService.confirmarEntrega(envioData.id, {
          nombre_receptor: datos.nombre_receptor,
          documento_receptor: datos.cedula_receptor
        });
        
        if (!resultadoEntrega.exito) {
          console.error('Error confirmando entrega:', resultadoEntrega.mensaje);
          return { exito: false, mensaje: resultadoEntrega.mensaje || 'Error al confirmar la entrega' };
        }
      } else {
        // Si no hay envío (caso legacy), actualizar el kit directamente
        const { error: kitUpdateError } = await this.supabase.client
          .from('kits_cirugia')
          .update({
            estado: 'entregado',
            fecha_recepcion: ahora,
            cliente_receptor_nombre: datos.nombre_receptor,
            cliente_receptor_cedula: datos.cedula_receptor,
            cliente_validacion_fecha: ahora,
            cliente_validacion_qr: datos.codigo_qr,
            updated_at: ahora
          })
          .eq('id', datos.kit_id);

        if (kitUpdateError) {
          console.error('Error actualizando kit:', kitUpdateError);
          return { exito: false, mensaje: 'Error al actualizar el estado del kit' };
        }

        // Registrar en trazabilidad (caso legacy sin envío)
        // NOTA: usuario_id es requerido, usar un ID de sistema o del técnico asignado
        const { data: kitInfo } = await this.supabase.client
          .from('kits_cirugia')
          .select('tecnico_id')
          .eq('id', datos.kit_id)
          .single();
        
        const { error: trazabilidadError } = await this.supabase.client
          .from('kit_trazabilidad')
          .insert({
            kit_id: datos.kit_id,
            accion: 'Entrega confirmada por cliente',
            estado_anterior: 'en_transito',
            estado_nuevo: 'entregado',
            usuario_id: kitInfo?.tecnico_id || null, // Usar técnico asignado o null
            timestamp: ahora,
            observaciones: `Recibido por: ${datos.nombre_receptor} (${datos.cedula_receptor})`,
            metadata: {
              nombre_receptor: datos.nombre_receptor,
              cedula_receptor: datos.cedula_receptor,
              firma_registrada: true,
              observaciones_cliente: datos.observaciones,
              validacion_publica: true
            }
          });
          
        if (trazabilidadError) {
          console.error('Error registrando trazabilidad:', trazabilidadError);
          // No fallar la operación, solo loguear el error
        }
      }

      // 6. Actualizar el QR code
      const { error: qrUpdateError } = await this.supabase.client
        .from('qr_codes')
        .update({
          veces_escaneado: (qrData.veces_escaneado || 0) + 1,
          ultimo_escaneo: ahora,
          validado_por: null, // Cliente no tiene perfil
          fecha_validacion: ahora,
          ubicacion_validacion: ubicacion,
          tipo_validacion: 'entrega_cliente'
        })
        .eq('id', qrData.id);

      if (qrUpdateError) {
        console.error('Error actualizando QR:', qrUpdateError);
      }

      return {
        exito: true,
        mensaje: 'Recepción registrada exitosamente',
        escaneo_id: escaneoData.id
      };

    } catch (error) {
      console.error('Error registrando recepción:', error);
      return {
        exito: false,
        mensaje: 'Error al procesar la recepción'
      };
    }
  }
}
