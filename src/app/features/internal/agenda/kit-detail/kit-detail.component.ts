import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KitService } from '../../../../shared/services/kit.service';
import { KitCirugia, KitProducto } from '../../../../shared/models/kit.model';

@Component({
  selector: 'app-kit-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kit-detail.component.html',
  styleUrl: './kit-detail.component.css'
})
export class KitDetailComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly kitService = inject(KitService);

  // Signals
  loading = signal(true);
  error = signal<string | null>(null);
  kit = signal<KitCirugia | null>(null);
  productos = signal<KitProducto[]>([]);

  // Propiedades
  kitId = '';

  ngOnInit() {
    this.kitId = this.route.snapshot.paramMap.get('id') || '';
    if (this.kitId) {
      this.cargarDatos();
    } else {
      this.error.set('ID de kit no válido');
      this.loading.set(false);
    }
  }

  private async cargarDatos() {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Cargar datos del kit
      await Promise.all([
        this.cargarKit(),
        this.cargarProductos()
      ]);

    } catch (error: any) {
      console.error('Error cargando datos del kit:', error);
      this.error.set(error.message || 'Error cargando la información del kit');
    } finally {
      this.loading.set(false);
    }
  }

  private async cargarKit() {
    try {
      const kit = await firstValueFrom(this.kitService.getKit(this.kitId));
      if (!kit) {
        throw new Error('Kit no encontrado');
      }
      this.kit.set(kit);
    } catch (error: any) {
      console.error('Error cargando kit:', error);
      throw new Error(`Error al cargar la información del kit: ${error.message || 'Error desconocido'}`);
    }
  }

  private async cargarProductos() {
    try {
      const productos = await firstValueFrom(this.kitService.getKitProductos(this.kitId));
      this.productos.set(productos || []);
    } catch (error: any) {
      console.error('Error cargando productos del kit:', error);
      // No lanzar error aquí para que no bloquee la carga del resto de datos
      this.productos.set([]);
    }
  }

  onEditarKit() {
    this.router.navigate(['/internal/agenda/kit-builder', this.kitId, 'edit']);
  }

  // Estado para el modal del QR
  mostrandoQr = signal(false);
  
  onGenerarQr() {
    this.mostrandoQr.set(true);
  }

  cerrarModalQr() {
    this.mostrandoQr.set(false);
  }

  imprimirQr() {
    window.print();
  }

  async copiarEnlace() {
    const kitUrl = `${window.location.origin}/internal/agenda/kit-detail/${this.kitId}`;
    try {
      await navigator.clipboard.writeText(kitUrl);
      console.log('Enlace copiado al portapapeles');
      // Aquí podrías mostrar un toast de confirmación
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    }
  }

  getQrUrl(): string {
    // Generar URL para el QR usando un servicio online
    const kitUrl = `${window.location.origin}/internal/agenda/kit-detail/${this.kitId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(kitUrl)}`;
  }

  volver() {
    this.router.navigate(['/internal/agenda']);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'en_preparacion': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'listo': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'entregado': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'devuelto': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  // Método helper para obtener información del cliente
  getClienteNombre(): string {
    const kit = this.kit();
    if (!kit?.cirugia?.cliente) return 'Sin información';
    
    return `${kit.cirugia.cliente.nombre} ${kit.cirugia.cliente.apellido}`.trim();
  }
}