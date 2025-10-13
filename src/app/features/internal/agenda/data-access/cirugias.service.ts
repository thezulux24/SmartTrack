import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, switchMap } from 'rxjs';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { Cirugia, CirugiaCreate } from './models';
import { TrazabilidadService } from '../../../../shared/services/trazabilidad.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class CirugiasService {
  constructor(
    private supabase: SupabaseService,
    private trazabilidadService: TrazabilidadService,
    private notificationService: NotificationService
  ) {}

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
      switchMap(cirugia => {
        // Registrar en trazabilidad que la cirugía fue creada
        return this.trazabilidadService.registrarEventoCirugia({
          cirugia_id: cirugia.id,
          accion: 'cirugia_creada',
          estado_nuevo: cirugia.estado || 'programada',
          observaciones: `Cirugía ${cirugia.numero_cirugia} creada - ${cirugia.tipo_cirugia_data?.nombre || 'Sin tipo'}`,
          metadata: {
            numero_cirugia: cirugia.numero_cirugia,
            tipo_cirugia: cirugia.tipo_cirugia_data?.nombre,
            hospital: cirugia.hospital_data?.nombre,
            fecha_programada: cirugia.fecha_programada
          }
        }).pipe(
          map(() => cirugia), // Retornar la cirugía creada
          catchError(trazError => {
            // Si falla la trazabilidad, loguear pero no fallar la creación
            console.error('Error al registrar trazabilidad:', trazError);
            return from([cirugia]); // Continuar con la cirugía creada
          })
        );
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

    // Primero obtener datos actuales para detectar cambios
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
          )
        `)
        .eq('id', id)
        .single()
    ).pipe(
      switchMap(currentResponse => {
        if (currentResponse.error) {
          throw new Error('Error al obtener datos actuales');
        }

        const datosAnteriores = currentResponse.data;
        let hubo_cambio_importante = false;
        let cambios_detalle: string[] = [];
        let is_urgent = false;

        // Detectar cambios importantes
        if (updates.fecha_programada) {
          // Normalizar fechas para comparar solo la fecha, no la hora
          const fechaAnterior = new Date(datosAnteriores.fecha_programada).toISOString().split('T')[0];
          const fechaNueva = new Date(updates.fecha_programada).toISOString().split('T')[0];
          
          if (fechaAnterior !== fechaNueva) {
            hubo_cambio_importante = true;
            const fechaAnteriorFormato = new Date(datosAnteriores.fecha_programada).toLocaleDateString('es-CO');
            const fechaNuevaFormato = new Date(updates.fecha_programada).toLocaleDateString('es-CO');
            cambios_detalle.push(`Fecha cambió de ${fechaAnteriorFormato} a ${fechaNuevaFormato}`);
            
            // Es urgente si la cirugía es en menos de 48 horas
            const horasHastaCirugia = (new Date(updates.fecha_programada).getTime() - Date.now()) / (1000 * 60 * 60);
            if (horasHastaCirugia < 48) is_urgent = true;
          }
        }

        if (updates.hora_inicio && updates.hora_inicio !== datosAnteriores.hora_inicio) {
          hubo_cambio_importante = true;
          cambios_detalle.push(`Hora cambió de ${datosAnteriores.hora_inicio || 'no definida'} a ${updates.hora_inicio}`);
        }

        if (updates.tecnico_asignado_id !== undefined && updates.tecnico_asignado_id !== datosAnteriores.tecnico_asignado_id) {
          hubo_cambio_importante = true;
          const anteriorNombre = datosAnteriores.tecnico_asignado?.full_name || 'Sin asignar';
          cambios_detalle.push(`Técnico cambió de ${anteriorNombre}`);
          is_urgent = true; // Cambio de técnico siempre es urgente
        }

        if (updates.hospital_id && updates.hospital_id !== datosAnteriores.hospital_id) {
          hubo_cambio_importante = true;
          cambios_detalle.push('Hospital cambió');
          is_urgent = true;
        }

        // Actualizar la cirugía
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

            // Enviar notificación si hubo cambios importantes
            if (hubo_cambio_importante) {
              const cirugiaActualizada = response.data;
              
              this.notificationService.notifyAgendaChange(
                id,
                cirugiaActualizada.numero_cirugia,
                datosAnteriores.usuario_creador_id,
                datosAnteriores.tecnico_asignado_id || null,
                cirugiaActualizada.tecnico_asignado_id || null,
                updates.notas || 'Modificación de agenda',
                cambios_detalle.join(', '),
                cirugiaActualizada.fecha_programada,
                cirugiaActualizada.hospital_data?.nombre || 'Hospital',
                is_urgent
              ).catch(err => console.error('Error enviando notificación de cambio:', err));
            }

            return response.data;
          }),
          catchError(error => {
            console.error('Service error updating cirugia:', error);
            return throwError(() => error);
          })
        );
      })
    );
  }

  updateEstado(id: string, estado: string, comentario?: string): Observable<void> {
    return from(this.supabase.client.auth.getUser()).pipe(
      switchMap(userResponse => {
        const user = userResponse.data.user;
        
        // Primero obtenemos el estado anterior y datos de la cirugía
        return from(
          this.supabase.client
            .from('cirugias')
            .select(`
              estado,
              numero_cirugia,
              fecha_programada,
              tecnico_asignado_id,
              usuario_creador_id,
              hospital_data:hospitales(nombre),
              tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(full_name)
            `)
            .eq('id', id)
            .single()
        ).pipe(
          switchMap(currentResponse => {
            if (currentResponse.error) {
              throw new Error('Error al obtener estado actual');
            }

            const estadoAnterior = currentResponse.data.estado;
            const numeroCirugia = currentResponse.data.numero_cirugia;
            const datosOriginales = currentResponse.data;

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

                // 📢 Si el estado cambió a 'cancelada', enviar notificación
                if (estado === 'cancelada' && estadoAnterior !== 'cancelada') {
                  const hospitalData: any = datosOriginales.hospital_data;
                  const hospitalNombre = Array.isArray(hospitalData) && hospitalData.length > 0 
                    ? hospitalData[0]?.nombre 
                    : (hospitalData?.nombre || 'Hospital');
                    
                  this.notificationService.notifyCirugiaCanceled(
                    id,
                    numeroCirugia,
                    comentario || 'Cirugía cancelada',
                    datosOriginales.fecha_programada,
                    hospitalNombre,
                    datosOriginales.tecnico_asignado_id || null,
                    datosOriginales.usuario_creador_id,
                    user?.email || 'Sistema'
                  ).catch(err => console.error('Error enviando notificación de cancelación:', err));
                }                // Registrar en trazabilidad
                return this.trazabilidadService.registrarEventoCirugia({
                  cirugia_id: id,
                  accion: 'estado_cambiado',
                  estado_anterior: estadoAnterior,
                  estado_nuevo: estado,
                  observaciones: comentario || `Estado cambiado de ${estadoAnterior} a ${estado}`,
                  metadata: {
                    numero_cirugia: numeroCirugia
                  }
                }).pipe(
                  catchError(trazError => {
                    console.error('Error al registrar trazabilidad:', trazError);
                    // No fallar si la trazabilidad falla
                    return from([null]);
                  })
                );
              })
            );
          })
        );
      }),
      map(() => {
        // Retornar void
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

  /**
   * Obtener cirugías con sus kits y productos para hojas de gasto
   */
  getCirugiasConKits(): Observable<any[]> {
    console.log('🔍 Ejecutando consulta getCirugiasConKits...');
    
    return from(
      this.supabase.client
        .from('cirugias')
        .select(`
          id,
          numero_cirugia,
          fecha_programada,
          tecnico_asignado_id,
          estado,
          cliente:clientes!cirugias_cliente_id_fkey(
            id,
            nombre,
            apellido
          ),
          tecnico_asignado:profiles!cirugias_tecnico_asignado_id_fkey(
            id,
            full_name
          ),
          kits:kits_cirugia(
            id,
            numero_kit,
            estado,
            productos:kit_productos(
              id,
              producto_id,
              cantidad_solicitada,
              precio_unitario,
              observaciones,
              producto:productos(
                id,
                nombre,
                categoria,
                precio
              )
            )
          )
        `)
        .order('fecha_programada', { ascending: false })
        .limit(20)
    ).pipe(
      map(response => {
        console.log('🔍 Respuesta raw de Supabase:', response);
        
        if (response.error) {
          console.error('❌ Error en consulta Supabase:', response.error);
          throw new Error(response.error.message || 'Error al cargar cirugías con kits');
        }
        
        const rawData = response.data || [];
        console.log('📊 Datos raw recibidos:', rawData.length, 'cirugías');
        console.log('📊 Primera cirugía:', rawData[0]);
        
        // Filtrar solo cirugías que tienen kits
        const cirugiasConKits = rawData.filter(c => c.kits && c.kits.length > 0);
        console.log('🔍 Cirugías con kits:', cirugiasConKits.length);
        
        // Transformar los datos al formato esperado por el componente
        const transformedData = cirugiasConKits.map(cirugia => ({
          id: cirugia.id,
          numero_cirugia: cirugia.numero_cirugia,
          fecha_cirugia: cirugia.fecha_programada,
          tecnico_asignado_id: cirugia.tecnico_asignado_id,
          cliente: cirugia.cliente,
          tecnico: {
            nombre: (cirugia.tecnico_asignado as any)?.full_name?.split(' ')[0] || 'Sin',
            apellido: (cirugia.tecnico_asignado as any)?.full_name?.split(' ').slice(1).join(' ') || 'Asignar'
          },
          kit: cirugia.kits?.[0] ? {
            nombre: `Kit ${cirugia.kits[0].numero_kit}`,
            items: cirugia.kits[0].productos?.map(p => ({
              id: p.producto?.id || p.id,
              nombre: p.producto?.nombre || 'Producto sin nombre',
              categoria: this.mapCategoria(p.producto?.categoria || ''),
              precio: p.precio_unitario || p.producto?.precio || 0,
              cantidad_requerida: p.cantidad_solicitada || 1,
              producto_id: p.producto_id // UUID real del producto
            })) || []
          } : null
        })).filter(c => c.kit && c.kit.items.length > 0);
        
        console.log('✅ Datos transformados final:', transformedData);
        return transformedData;
      }),
      catchError(error => {
        console.error('❌ Service error loading cirugias con kits:', error);
        return throwError(() => error);
      })
    );
  }

  private mapCategoria(categoria: string): string {
    const mappings: { [key: string]: string } = {
      'implantes': 'productos',
      'instrumentos': 'productos',
      'medicamentos': 'productos',
      'transporte': 'transporte',
      'otros': 'otros'
    };
    return mappings[categoria] || 'productos';
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