import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CotizacionService } from '../../../../shared/services/cotizacion.service';
import { PdfService } from '../../../../shared/services/pdf.service';
import { Cotizacion } from '../../../../shared/models/cotizacion.model';
import { CirugiasService } from '../../agenda/data-access/cirugias.service';
import { CirugiaCreate } from '../../agenda/data-access/models/cirugia.model';
import { ClientesService } from '../../clientes/data-acces/clientes.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../auth/data-access/auth.service';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { KitService } from '../../../../shared/services/kit.service';
import { CreateKitRequest } from '../../../../shared/models/kit.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-cotizacion-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cotizacion-detail.component.html'
})
export class CotizacionDetailComponent implements OnInit {
  private cotizacionService = inject(CotizacionService);
  private pdfService = inject(PdfService);
  private cirugiasService = inject(CirugiasService);
  private clientesService = inject(ClientesService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private kitService = inject(KitService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  cotizacion = signal<Cotizacion | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  enviando = signal(false);
  convirtiendoCirugia = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarCotizacion(id);
    }
  }

  async cargarCotizacion(id: string) {
    this.loading.set(true);
    this.cotizacionService.getById(id).subscribe({
      next: (cotizacion: Cotizacion | null) => {
        this.cotizacion.set(cotizacion);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Error al cargar la cotización');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  volver() {
    this.router.navigate(['/internal/cotizaciones']);
  }

  editar() {
    this.router.navigate(['/internal/cotizaciones/editar', this.cotizacion()!.id]);
  }

  async enviarPorEmail() {
    if (!confirm('¿Marcar esta cotización como enviada?')) return;

    this.enviando.set(true);
    try {
      // Cambiar el estado a enviada (sin enviar email real)
      const resultado = await this.cotizacionService.cambiarEstado(
        this.cotizacion()!.id, 
        'enviada',
        'Cotización marcada como enviada'
      );

      if (resultado.exito) {
        alert('✅ Cotización marcada como ENVIADA');
        this.cargarCotizacion(this.cotizacion()!.id);
      } else {
        alert(`Error: ${resultado.mensaje}`);
      }
    } catch (err: any) {
      alert('Error al actualizar el estado');
      console.error(err);
    } finally {
      this.enviando.set(false);
    }
  }

  async marcarComoAprobada() {
    if (!confirm('Marcar esta cotización como aprobada?')) return;

    try {
      const resultado = await this.cotizacionService.cambiarEstado(
        this.cotizacion()!.id, 
        'aprobada',
        'Cotización aprobada por el cliente'
      );

      if (resultado.exito) {
        alert('Cotización marcada como aprobada');
        this.cargarCotizacion(this.cotizacion()!.id);
      } else {
        alert('Error: ' + resultado.mensaje);
      }
    } catch (err: any) {
      alert('Error al actualizar el estado');
      console.error(err);
    }
  }

  async marcarComoRechazada() {
    const motivo = prompt('Motivo del rechazo (opcional):');
    
    try {
      const resultado = await this.cotizacionService.cambiarEstado(
        this.cotizacion()!.id, 
        'rechazada',
        motivo || 'Cotización rechazada por el cliente'
      );

      if (resultado.exito) {
        alert('Cotización marcada como rechazada');
        this.cargarCotizacion(this.cotizacion()!.id);
      } else {
        alert('Error: ' + resultado.mensaje);
      }
    } catch (err: any) {
      alert('Error al actualizar el estado');
      console.error(err);
    }
  }

  async convertirACirugia() {
    const cotizacion = this.cotizacion();
    if (!cotizacion) {
      alert('No hay cotización cargada');
      return;
    }

    // Validar estado
    if (cotizacion.estado !== 'aprobada') {
      alert('Solo se pueden convertir cotizaciones aprobadas');
      return;
    }

    // Validar que no esté ya convertida
    if (cotizacion.convertida_a_cirugia) {
      alert('Esta cotización ya fue convertida en cirugía');
      if (cotizacion.cirugia_id) {
        // Navegar a la cirugía existente
        this.router.navigate(['/internal/agenda/cirugia', cotizacion.cirugia_id]);
      }
      return;
    }

    // Validar datos requeridos
    if (!cotizacion.tipo_cirugia_id) {
      alert('La cotización debe tener un tipo de cirugía asignado');
      return;
    }

    if (!cotizacion.hospital_id) {
      alert('La cotización debe tener un hospital asignado');
      return;
    }

    // Usar datos de la cotización o pedir al usuario si faltan
    let medico = cotizacion.medico_cirujano;
    if (!medico || medico.trim() === '') {
      const medicoInput = prompt('Ingrese el nombre del médico cirujano:', '');
      if (!medicoInput || medicoInput.trim() === '') {
        return; // Usuario canceló
      }
      medico = medicoInput;
    }

    let fechaProgramada = cotizacion.fecha_programada;
    if (!fechaProgramada) {
      const fechaInput = prompt('Ingrese la fecha programada (YYYY-MM-DD):', 
        new Date().toISOString().split('T')[0]);
      if (!fechaInput) {
        return; // Usuario canceló
      }
      fechaProgramada = fechaInput;
    }

    // Hora de inicio es opcional
    const horaInicio = prompt('Ingrese la hora de inicio (HH:MM) [Opcional]:', '08:00');

    if (!confirm(`¿Crear cirugía a partir de esta cotización?\n\nMédico: ${medico}\nFecha: ${fechaProgramada}\nHora: ${horaInicio || 'No especificada'}`)) {
      return;
    }

    this.convirtiendoCirugia.set(true);

    try {
      // Generar número de cirugía
      const numeroCirugia = this.generateNumeroCirugia();

      // Crear datos de cirugía
      const cirugiaData: CirugiaCreate = {
        numero_cirugia: numeroCirugia,
        cliente_id: cotizacion.cliente_id,
        hospital_id: cotizacion.hospital_id,
        tipo_cirugia_id: cotizacion.tipo_cirugia_id,
        medico_cirujano: medico.trim(),
        fecha_programada: new Date(fechaProgramada).toISOString(),
        hora_inicio: horaInicio || undefined,
        duracion_estimada: 120, // Valor por defecto 2 horas
        estado: 'programada',
        prioridad: 'normal',
        notas: `Creada desde cotización ${cotizacion.numero_cotizacion}\n\nObservaciones: ${cotizacion.observaciones || 'N/A'}`
      };

      // Crear la cirugía
      this.cirugiasService.createCirugia(cirugiaData).subscribe({
        next: async (cirugia) => {
          console.log('✅ Cirugía creada:', cirugia);

          // Marcar cotización como convertida
          await this.marcarCotizacionConvertida(cotizacion.id, cirugia.id);

          // Crear kit automáticamente con los productos de la cotización
          if (cotizacion.items && cotizacion.items.length > 0) {
            try {
              console.log('📦 Creando kit automáticamente con productos de cotización...');
              await this.crearKitDesdeCotizacion(cirugia.id, cotizacion);
            } catch (kitError: any) {
              console.error('❌ Error al crear kit automático:', kitError);
              // No bloqueamos el flujo si falla el kit, se puede crear después
              alert(`⚠️ Cirugía creada pero hubo un error al crear el kit automáticamente: ${kitError.message}\n\nPuede crear el kit manualmente desde la cirugía.`);
            }
          }

          // Enviar notificaciones
          await this.enviarNotificacionesCirugia(cirugia, cotizacion);

          this.convirtiendoCirugia.set(false);
          
          const mensajeKit = cotizacion.items && cotizacion.items.length > 0 
            ? '\n📦 Kit creado automáticamente con los productos de la cotización.' 
            : '';
          
          alert(`✅ Cirugía ${cirugia.numero_cirugia} creada exitosamente${mensajeKit}`);
          
          // Navegar a la cirugía creada
          this.router.navigate(['/internal/agenda/cirugia', cirugia.id]);
        },
        error: (err) => {
          console.error('❌ Error creando cirugía:', err);
          this.convirtiendoCirugia.set(false);
          alert('Error al crear la cirugía: ' + (err?.message || 'Error desconocido'));
        }
      });

    } catch (error: any) {
      console.error('❌ Error:', error);
      this.convirtiendoCirugia.set(false);
      alert('Error al procesar la conversión: ' + error.message);
    }
  }

  private generateNumeroCirugia(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `CIR-${year}-${timestamp}`;
  }

  private async marcarCotizacionConvertida(cotizacionId: string, cirugiaId: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.supabaseClient
        .from('cotizaciones')
        .update({
          convertida_a_cirugia: true,
          cirugia_id: cirugiaId
        })
        .eq('id', cotizacionId);

      if (error) throw error;

      // Registrar en historial
      const session = await this.authService.session();
      if (session?.data?.session?.user?.id) {
        await this.supabaseService.supabaseClient
          .from('cotizacion_historial')
          .insert({
            cotizacion_id: cotizacionId,
            estado_anterior: 'aprobada',
            estado_nuevo: 'aprobada',
            usuario_id: session.data.session.user.id,
            comentario: `Convertida en cirugía ${cirugiaId}`
          });
      }

      console.log('✅ Cotización marcada como convertida');
    } catch (error) {
      console.error('❌ Error al marcar cotización:', error);
    }
  }

  private async enviarNotificacionesCirugia(cirugia: any, cotizacion: Cotizacion): Promise<void> {
    try {
      const session = await this.authService.session();
      const currentUserId = session?.data?.session?.user?.id;
      
      let creatorName = 'Un comercial';
      if (currentUserId) {
        const { data: profile } = await this.supabaseService.supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();
        
        if (profile?.full_name) {
          creatorName = profile.full_name;
        }
      }
      
      const hospitalName = cotizacion.hospital?.nombre || 'Hospital no especificado';
      
      const fechaFormateada = new Date(cirugia.fecha_programada).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      await this.notificationService.notifyNewCirugia(
        cirugia.tecnico_asignado_id || null,
        cirugia.id,
        cirugia.numero_cirugia,
        cirugia.medico_cirujano,
        fechaFormateada,
        hospitalName,
        creatorName
      );
      
    } catch (error) {
    }
  }

  private async crearKitDesdeCotizacion(cirugiaId: string, cotizacion: Cotizacion): Promise<void> {
    try {
      // Mapear los items de la cotización a productos del kit
      const productosKit = cotizacion.items!.map(item => ({
        producto_id: item.producto_id || '', // Si no tiene producto_id, usar string vacío (se puede manejar mejor)
        cantidad_solicitada: item.cantidad,
        observaciones: item.observaciones
      })).filter(p => p.producto_id !== ''); // Filtrar items sin producto_id

      if (productosKit.length === 0) {
        console.log('⚠️ No hay productos con producto_id para crear el kit');
        return;
      }

      const kitRequest: CreateKitRequest = {
        cirugia_id: cirugiaId,
        productos: productosKit,
        observaciones: `Kit creado automáticamente desde cotización ${cotizacion.numero_cotizacion}\n\n${cotizacion.observaciones || ''}`
      };

      const kit = await firstValueFrom(this.kitService.crearKit(kitRequest));
      console.log('✅ Kit creado automáticamente:', kit.numero_kit);
    } catch (error) {
      console.error('❌ Error en crearKitDesdeCotizacion:', error);
      throw error;
    }
  }

  async descargarPDF() {
    try {
      if (!this.cotizacion()) {
        alert('No hay cotización cargada');
        return;
      }
      
      // Generar y descargar el PDF
      this.pdfService.generarCotizacionPDF(this.cotizacion()!);
      
    } catch (error: any) {
      alert('Error al generar el PDF');
      console.error(error);
    }
  }

  async eliminar() {
    if (!confirm('Estás seguro de eliminar esta cotización?')) return;

    this.cotizacionService.delete(this.cotizacion()!.id).subscribe({
      next: (resultado: { exito: boolean; mensaje?: string }) => {
        if (resultado.exito) {
          alert('Cotización eliminada');
          this.router.navigate(['/internal/cotizaciones']);
        } else {
          alert('Error: ' + resultado.mensaje);
        }
      },
      error: (err: any) => {
        alert('Error al eliminar la cotización');
        console.error(err);
      }
    });
  }

  getEstadoClass(estado: string): string {
    const base = 'px-4 py-2 rounded-lg font-semibold text-sm';
    switch (estado) {
      case 'borrador': return base + ' bg-gray-200 text-gray-700';
      case 'enviada': return base + ' bg-blue-100 text-blue-700';
      case 'aprobada': return base + ' bg-green-100 text-green-700';
      case 'rechazada': return base + ' bg-red-100 text-red-700';
      case 'vencida': return base + ' bg-orange-100 text-orange-700';
      default: return base + ' bg-gray-100 text-gray-600';
    }
  }

  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      borrador: ' Borrador',
      enviada: ' Enviada',
      aprobada: ' Aprobada',
      rechazada: ' Rechazada',
      vencida: ' Vencida',
      cancelada: ' Cancelada'
    };
    return labels[estado] || estado;
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
