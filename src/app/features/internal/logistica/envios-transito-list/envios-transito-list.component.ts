import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { EnvioService } from '../../../../shared/services/envio.service';
import { Envio } from '../../../../shared/models/envio.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-envios-transito-list',
  imports: [CommonModule, QRCodeModule],
  templateUrl: './envios-transito-list.component.html',
  styleUrl: './envios-transito-list.component.css'
})
export class EnviosTransitoListComponent implements OnInit {
  private router = inject(Router);
  private envioService = inject(EnvioService);

  // Signals
  envios = signal<Envio[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  filtroEstado = signal<'todos' | 'programado' | 'en_transito'>('todos');
  mostrarQR = signal<string | null>(null); // ID del kit cuyo QR se está mostrando
  codigoQR = signal<string>('');
  urlQR = signal<string>('');

  // Computed
  enviosFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'todos') return this.envios();
    return this.envios().filter(e => e.estado === filtro);
  });

  ngOnInit() {
    this.cargarEnvios();
  }

  cargarEnvios() {
    this.cargando.set(true);
    this.error.set(null);

    this.envioService.getEnviosActivos().subscribe({
      next: (envios) => {
        this.envios.set(envios);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando envíos:', err);
        this.error.set('Error al cargar envíos activos');
        this.cargando.set(false);
      }
    });
  }

  async iniciarEnvio(envio: Envio) {
    if (!confirm(`¿Iniciar envío del kit ${envio.kit?.numero_kit}?\nEl mensajero ${envio.mensajero?.nombre} comenzará el trayecto.`)) {
      return;
    }

    try {
      const resultado = await this.envioService.iniciarEnvio(envio.id!);
      if (resultado.exito) {
        alert('Envío iniciado exitosamente');
        this.cargarEnvios();
      } else {
        alert(resultado.mensaje || 'Error al iniciar envío');
      }
    } catch (error) {
      console.error('Error iniciando envío:', error);
      alert('Error al iniciar el envío');
    }
  }

  volver() {
    this.router.navigate(['/internal/logistica']);
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'programado':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
      case 'en_transito':
        return 'bg-blue-500/20 text-blue-300 border-blue-500';
      case 'entregado':
        return 'bg-green-500/20 text-green-300 border-green-500';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'programado':
        return 'Programado';
      case 'en_transito':
        return 'En Tránsito';
      case 'entregado':
        return 'Entregado';
      default:
        return estado;
    }
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return 'N/A';
    return new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  verQR(envio: Envio) {
    if (!envio.kit?.codigo_qr) {
      alert('Este kit no tiene código QR asignado');
      return;
    }
    
    this.mostrarQR.set(envio.kit.id);
    this.codigoQR.set(envio.kit.codigo_qr);
    
    // Generar URL pública para el QR usando variable de entorno
    this.urlQR.set(`${environment.PUBLIC_URL}/qr/${envio.kit.codigo_qr}`);
  }

  cerrarQR() {
    this.mostrarQR.set(null);
    this.codigoQR.set('');
    this.urlQR.set('');
  }

  descargarQR() {
    const canvas = document.querySelector('qrcode canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR-${this.codigoQR()}.png`;
      link.href = url;
      link.click();
    }
  }
}
