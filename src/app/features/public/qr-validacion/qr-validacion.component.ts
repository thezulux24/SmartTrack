import { Component, OnInit, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QrValidacionService } from './qr-validacion.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-qr-validacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-validacion.component.html',
  styleUrl: './qr-validacion.component.css'
})
export class QrValidacionComponent implements OnInit {
  @ViewChild('firmaCanvas', { static: false }) firmaCanvas!: ElementRef<HTMLCanvasElement>;
  
  private ctx: CanvasRenderingContext2D | null = null;
  private dibujando = false;

  codigoQR = signal<string>('');
  loading = signal(true);
  procesando = signal(false);
  error = signal<string>('');
  exitoso = signal(false);

  // Datos del kit
  kit = signal<any>(null);
  productos = signal<any[]>([]);

  // Datos del formulario de validación
  nombreReceptor = signal<string>('');
  cedulaReceptor = signal<string>('');
  observaciones = signal<string>('');
  firmaDataUrl = signal<string>('');

  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private qrService: QrValidacionService = inject(QrValidacionService);
  private notificationService: NotificationService = inject(NotificationService);

  ngOnInit() {
    const codigo = this.route.snapshot.paramMap.get('codigo');
    if (codigo) {
      this.codigoQR.set(codigo);
      this.cargarDatosKit(codigo);
    } else {
      this.error.set('Código QR no válido');
      this.loading.set(false);
    }
  }

  ngAfterViewInit() {
    this.inicializarCanvas();
  }

  async cargarDatosKit(codigo: string) {
    try {
      this.loading.set(true);
      this.error.set('');

      const resultado = await this.qrService.validarQR(codigo) as any;
      
      if (!resultado.valido) {
        this.error.set(resultado.mensaje || 'QR no válido o ya utilizado');
        return;
      }

      this.kit.set(resultado.kit);
      this.productos.set(resultado.productos || []);

    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      this.error.set('Error al cargar los datos del kit. Intente nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  inicializarCanvas() {
    if (this.firmaCanvas) {
      const canvas = this.firmaCanvas.nativeElement;
      this.ctx = canvas.getContext('2d');
      
      if (this.ctx) {
        // Limpiar con fondo blanco para contraste
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Configurar trazo negro
        this.ctx.strokeStyle = '#000000'; // Negro sólido para mejor visibilidad
        this.ctx.lineWidth = 3; // Más grueso para mejor visibilidad en móvil
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
      }

      // Eventos táctiles para móviles
      canvas.addEventListener('touchstart', (e) => this.iniciarDibujo(e, true), { passive: false });
      canvas.addEventListener('touchmove', (e) => this.dibujar(e, true), { passive: false });
      canvas.addEventListener('touchend', () => this.detenerDibujo());
      canvas.addEventListener('touchcancel', () => this.detenerDibujo());
    }
  }

  iniciarDibujo(event: MouseEvent | TouchEvent, esMovil = false) {
    this.dibujando = true;
    const canvas = this.firmaCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Calcular el factor de escala entre el tamaño del canvas y el tamaño mostrado
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x, y;
    if (esMovil && event instanceof TouchEvent) {
      event.preventDefault();
      const touch = event.touches[0];
      x = (touch.clientX - rect.left) * scaleX;
      y = (touch.clientY - rect.top) * scaleY;
    } else if (event instanceof MouseEvent) {
      x = (event.clientX - rect.left) * scaleX;
      y = (event.clientY - rect.top) * scaleY;
    }

    if (this.ctx && x !== undefined && y !== undefined) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    }
  }

  dibujar(event: MouseEvent | TouchEvent, esMovil = false) {
    if (!this.dibujando || !this.ctx) return;

    const canvas = this.firmaCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Calcular el factor de escala entre el tamaño del canvas y el tamaño mostrado
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let x, y;
    if (esMovil && event instanceof TouchEvent) {
      event.preventDefault();
      const touch = event.touches[0];
      x = (touch.clientX - rect.left) * scaleX;
      y = (touch.clientY - rect.top) * scaleY;
    } else if (event instanceof MouseEvent) {
      x = (event.clientX - rect.left) * scaleX;
      y = (event.clientY - rect.top) * scaleY;
    }

    if (x !== undefined && y !== undefined) {
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
  }

  detenerDibujo() {
    if (this.dibujando) {
      this.dibujando = false;
      // Guardar la firma como base64
      const canvas = this.firmaCanvas.nativeElement;
      this.firmaDataUrl.set(canvas.toDataURL('image/png'));
    }
  }

  limpiarFirma() {
    if (this.ctx && this.firmaCanvas) {
      const canvas = this.firmaCanvas.nativeElement;
      // Limpiar con fondo blanco
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.firmaDataUrl.set('');
    }
  }

  validarFormulario(): boolean {
    if (!this.nombreReceptor().trim()) {
      alert('Por favor ingrese su nombre completo');
      return false;
    }
    if (!this.cedulaReceptor().trim()) {
      alert('Por favor ingrese su número de cédula');
      return false;
    }
    if (!this.firmaDataUrl()) {
      alert('Por favor firme en el recuadro');
      return false;
    }
    return true;
  }

  async confirmarRecepcion() {
    if (!this.validarFormulario()) return;

    try {
      this.procesando.set(true);
      this.error.set('');

      const resultado = await this.qrService.registrarRecepcion({
        codigo_qr: this.codigoQR(),
        kit_id: this.kit()?.id,
        nombre_receptor: this.nombreReceptor(),
        cedula_receptor: this.cedulaReceptor(),
        observaciones: this.observaciones(),
        firma_digital: this.firmaDataUrl()
      });

      if (resultado.exito) {
        this.exitoso.set(true);
        
        // Enviar notificaciones a los responsables
        await this.enviarNotificacionesEntrega();
      } else {
        this.error.set(resultado.mensaje || 'Error al registrar la recepción');
      }

    } catch (err: any) {
      console.error('Error al confirmar recepción:', err);
      this.error.set('Error al procesar la solicitud. Intente nuevamente.');
    } finally {
      this.procesando.set(false);
    }
  }

  /**
   * Envía notificaciones a los responsables del kit sobre la entrega
   */
  private async enviarNotificacionesEntrega() {
    try {
      const kit = this.kit();
      if (!kit?.cirugia) return;

      const cirugia = kit.cirugia;
      const usuariosANotificar: string[] = [];

      // Agregar técnico asignado
      if (cirugia.tecnico_id) {
        usuariosANotificar.push(cirugia.tecnico_id);
      }

      // Agregar comercial asignado
      if (cirugia.comercial_id) {
        usuariosANotificar.push(cirugia.comercial_id);
      }

      // Agregar logística asignada
      if (cirugia.logistica_id) {
        usuariosANotificar.push(cirugia.logistica_id);
      }

      // Enviar notificaciones
      if (usuariosANotificar.length > 0) {
        const clienteNombre = cirugia.cliente 
          ? `${cirugia.cliente.nombre} ${cirugia.cliente.apellido}`.trim()
          : 'Cliente';
        
        const mensaje = `El kit ${kit.numero_kit || ''} ha sido entregado y confirmado por ${this.nombreReceptor()} (${this.cedulaReceptor()}) para la cirugía ${cirugia.numero_cirugia || ''} del cliente ${clienteNombre}`;

        await this.notificationService.notifyUsers(
          usuariosANotificar,
          'cambio_estado_kit',
          'Kit Entregado y Confirmado',
          mensaje,
          'high',
          {
            kit_id: kit.id,
            cirugia_id: cirugia.id,
            numero_kit: kit.numero_kit,
            estado: 'entregado',
            receptor: this.nombreReceptor(),
            documento_receptor: this.cedulaReceptor()
          },
          `/internal/logistica/kit-detail/${kit.id}`
        );
      }
    } catch (error) {
      console.error('Error enviando notificaciones de entrega:', error);
      // No fallar la operación principal si falla la notificación
    }
  }

  obtenerNombreCliente(): string {
    return this.kit()?.cirugia?.cliente?.nombre || 'N/A';
  }

  obtenerNombreHospital(): string {
    return this.kit()?.cirugia?.hospital?.nombre || 'N/A';
  }

  obtenerFechaCirugia(): string {
    const fecha = this.kit()?.cirugia?.fecha_programada;
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
