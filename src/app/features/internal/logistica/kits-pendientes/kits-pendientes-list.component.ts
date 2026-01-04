import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KitService } from '../../../../shared/services/kit.service';
import { ProductosService } from '../../inventario/data-access/productos.service';
import { KitCirugia } from '../../../../shared/models/kit.model';

interface KitConStock extends KitCirugia {
  productos_con_stock?: Array<{
    id: string;
    producto_id: string;
    nombre: string;
    cantidad_solicitada: number;
    stock_disponible: number;
    suficiente: boolean;
  }>;
}

@Component({
  selector: 'app-kits-pendientes-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kits-pendientes-list.component.html'
})
export class KitsPendientesListComponent implements OnInit {
  private router = inject(Router);
  private kitService = inject(KitService);
  private productosService = inject(ProductosService);

  kitsPendientes = signal<KitConStock[]>([]);
  loading = signal(true);
  procesando = signal(false);

  ngOnInit() {
    this.cargarKitsPendientes();
  }

  async cargarKitsPendientes() {
    try {
      this.loading.set(true);
      
      // Obtener kits con estado 'solicitado'
      this.kitService.getKitsPorEstado('solicitado').subscribe({
        next: async (kits) => {
          
          // Enriquecer con información de stock
          const kitsConStock = await Promise.all(
            kits.map(async (kit) => {
              const productosConStock = await Promise.all(
                (kit.productos || []).map(async (prod) => {
                  return {
                    id: prod.id,
                    producto_id: prod.producto_id,
                    nombre: prod.producto?.nombre || 'N/A',
                    cantidad_solicitada: prod.cantidad_solicitada,
                    stock_disponible: prod.producto?.stock_total || 0,
                    suficiente: (prod.producto?.stock_total || 0) >= prod.cantidad_solicitada
                  };
                })
              );

              return {
                ...kit,
                productos_con_stock: productosConStock
              };
            })
          );

          this.kitsPendientes.set(kitsConStock);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error cargando kits pendientes:', error);
          alert(`Error al cargar kits: ${error.message || 'Error desconocido'}`);
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error en cargarKitsPendientes:', error);
      this.loading.set(false);
    }
  }

  async aprobarKit(kitId: string) {
    if (this.procesando()) return;

    try {
      this.procesando.set(true);

      // Cambiar estado a 'preparando'
      await firstValueFrom(
        this.kitService.actualizarEstadoKit(kitId, 'preparando', {
          observaciones: 'Kit aprobado por logística'
        })
      );

      console.log('Kit aprobado exitosamente');
      // Navegar a la pantalla de preparación
      this.router.navigate(['/internal/logistica/kit-preparacion', kitId]);
    } catch (error) {
      alert('Error al aprobar el kit');
      this.procesando.set(false);
    }
  }

  async rechazarKit(kitId: string) {
    if (this.procesando()) return;

    const motivo = prompt('¿Por qué rechazas este kit?');
    if (!motivo) return;

    try {
      this.procesando.set(true);
      console.log('Rechazando kit:', kitId, 'Motivo:', motivo);

      await firstValueFrom(
        this.kitService.actualizarEstadoKit(kitId, 'cancelado', {
          observaciones: `Rechazado por logística: ${motivo}`
        })
      );

      console.log('Kit rechazado exitosamente');
      // Recargar lista
      await this.cargarKitsPendientes();
    } catch (error) {
      console.error('Error rechazando kit:', error);
      alert('Error al rechazar el kit');
    } finally {
      this.procesando.set(false);
    }
  }

  obtenerNombreCliente(kit: KitCirugia): string {
    const cliente = kit.cirugia?.cliente;
    if (cliente) {
      return `${cliente.nombre} ${cliente.apellido}`;
    }
    return 'N/A';
  }

  obtenerNombreHospital(kit: KitCirugia): string {
    return kit.cirugia?.hospital?.nombre || 'N/A';
  }

  calcularStockTotal(producto: any): number {
    if (!producto?.producto?.inventario) return 0;
    
    // Sumar todas las cantidades del inventario disponible
    return producto.producto.inventario
      .filter((inv: any) => inv.estado === 'disponible')
      .reduce((total: number, inv: any) => total + (inv.cantidad || 0), 0);
  }

  tieneStockSuficiente(producto: any): boolean {
    const stockTotal = this.calcularStockTotal(producto);
    return stockTotal >= producto.cantidad_solicitada;
  }

  volver() {
    this.router.navigate(['/internal/logistica']);
  }
}
