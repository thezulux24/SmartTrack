import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { KitService } from '../../../../shared/services/kit.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-logistica-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './logistica-dashboard.component.html'
})
export class LogisticaDashboardComponent implements OnInit {
  private router = inject(Router);
  private kitService = inject(KitService);

  stats = signal({
    pendientes: 0,
    preparando: 0,
    listos: 0,
    enTransito: 0
  });

  alertas = signal<Array<{id: string, mensaje: string, detalles: string}>>([]);
  loading = signal(true);

  ngOnInit() {
    this.cargarEstadisticas();
  }

  cargarEstadisticas() {
    this.loading.set(true);
    
    // Cargar estadísticas reales desde la base de datos
    forkJoin({
      pendientes: this.kitService.getKitsPorEstado('solicitado'),
      preparando: this.kitService.getKitsPorEstado('preparando'),
      listos: this.kitService.getKitsPorEstado('listo_envio'),
      enTransito: this.kitService.getKitsPorEstado('en_transito')
    }).subscribe({
      next: (resultado) => {
        this.stats.set({
          pendientes: resultado.pendientes.length,
          preparando: resultado.preparando.length,
          listos: resultado.listos.length,
          enTransito: resultado.enTransito.length
        });

        // Generar alertas para kits urgentes (cirugías en las próximas 24 horas)
        const ahora = new Date();
        const alertasArray: Array<{id: string, mensaje: string, detalles: string}> = [];
        
        resultado.pendientes.forEach(kit => {
          if (kit.cirugia?.fecha_programada) {
            const fechaCirugia = new Date(kit.cirugia.fecha_programada);
            const horasRestantes = (fechaCirugia.getTime() - ahora.getTime()) / (1000 * 60 * 60);
            
            if (horasRestantes <= 24 && horasRestantes > 0) {
              alertasArray.push({
                id: kit.id,
                mensaje: `Kit ${kit.numero_kit} requiere aprobación urgente`,
                detalles: `Cirugía programada para ${fechaCirugia.toLocaleDateString()} a las ${fechaCirugia.toLocaleTimeString()}`
              });
            }
          }
        });

        this.alertas.set(alertasArray);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        this.loading.set(false);
      }
    });
  }

  navegarA(ruta: string) {
    this.router.navigate([ruta]);
  }
}
