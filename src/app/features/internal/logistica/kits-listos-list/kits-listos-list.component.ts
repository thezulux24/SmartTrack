import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { KitService } from '../../../../shared/services/kit.service';

@Component({
  selector: 'app-kits-listos-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kits-listos-list.component.html',
  styleUrl: './kits-listos-list.component.css'
})
export class KitsListosListComponent implements OnInit {
  kitsListos = signal<any[]>([]);
  loading = signal(true);

  constructor(
    private kitService: KitService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarKits();
  }

  async cargarKits() {
    this.loading.set(true);
    try {
      this.kitService.getKitsPorEstado('listo_envio').subscribe({
        next: (kits) => {
          this.kitsListos.set(kits || []);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error al cargar kits listos:', error);
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error al cargar kits listos:', error);
      this.loading.set(false);
    }
  }

  verDetalle(kitId: string) {
    // Navegar a vista de detalle read-only
    this.router.navigate(['/internal/logistica/kit-preparacion', kitId], {
      queryParams: { modo: 'ver' }
    });
  }

  asignarMensajero(kitId: string) {
    this.router.navigate(['/internal/logistica/asignar-mensajero', kitId]);
  }

  volver() {
    this.router.navigate(['/internal/logistica']);
  }

  obtenerNombreCliente(kit: any): string {
    return kit.cirugia?.cliente?.nombre || 'N/A';
  }

  obtenerNombreHospital(kit: any): string {
    return kit.cirugia?.hospital?.nombre || 'N/A';
  }

  calcularDiasRestantes(fechaProgramada: string): number {
    if (!fechaProgramada) return 0;
    const hoy = new Date();
    const fecha = new Date(fechaProgramada);
    const diff = fecha.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  obtenerColorUrgencia(dias: number): string {
    if (dias <= 1) return 'text-red-400';
    if (dias <= 3) return 'text-orange-400';
    return 'text-white';
  }
}
