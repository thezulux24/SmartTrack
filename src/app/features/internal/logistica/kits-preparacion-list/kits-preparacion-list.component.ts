import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { KitService } from '../../../../shared/services/kit.service';
import { KitCirugia } from '../../../../shared/models/kit.model';

@Component({
  selector: 'app-kits-preparacion-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kits-preparacion-list.component.html'
})
export class KitsPreparacionListComponent implements OnInit {
  private router = inject(Router);
  private kitService = inject(KitService);

  kitsPreparacion = signal<KitCirugia[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.cargarKits();
  }

  cargarKits() {
    this.loading.set(true);
    
    // Obtener kits en estado 'preparando'
    this.kitService.getKitsPorEstado('preparando').subscribe({
      next: (kits) => {
        this.kitsPreparacion.set(kits);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando kits:', error);
        this.loading.set(false);
      }
    });
  }

  verDetalle(kitId: string) {
    this.router.navigate(['/internal/logistica/kit-preparacion', kitId]);
  }

  volver() {
    this.router.navigate(['/internal/logistica']);
  }

  obtenerNombreCliente(kit: KitCirugia): string {
    const cirugia = kit.cirugia as any;
    if (cirugia?.cliente) {
      return `${cirugia.cliente.nombre} ${cirugia.cliente.apellido}`;
    }
    return 'N/A';
  }

  obtenerNombreHospital(kit: KitCirugia): string {
    const cirugia = kit.cirugia as any;
    return cirugia?.hospital?.nombre || 'N/A';
  }

  calcularDiasRestantes(fechaProgramada: string): number {
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
