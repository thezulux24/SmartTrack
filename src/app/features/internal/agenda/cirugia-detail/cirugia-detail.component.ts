import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs/operators';

import { CirugiasService } from '../data-access/cirugias.service';
import { Cirugia } from '../data-access/models';

@Component({
  selector: 'app-cirugia-detail',
  standalone: true,
  imports: [CommonModule], // ✅ Removido RouterLink ya que no se usa
  templateUrl: './cirugia-detail.component.html',
  styleUrl: './cirugia-detail.component.css'
})
export class CirugiaDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cirugiasService = inject(CirugiasService);

  // Signals
  loading = signal(false);
  error = signal<string | null>(null);
  cirugia = signal<Cirugia | null>(null);
  
  // Estados y prioridades para mostrar
  estadosInfo = {
    'programada': { label: 'Programada', color: 'bg-blue-100 text-blue-800', icon: '📅' },
    'en_curso': { label: 'En Curso', color: 'bg-yellow-100 text-yellow-800', icon: '⚡' },
    'completada': { label: 'Completada', color: 'bg-green-100 text-green-800', icon: '✅' },
    'cancelada': { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: '❌' },
    'urgencia': { label: 'Urgencia', color: 'bg-orange-100 text-orange-800', icon: '🚨' }
  };

  prioridadesInfo = {
    'baja': { label: 'Baja', color: 'bg-gray-100 text-gray-800' },
    'normal': { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    'alta': { label: 'Alta', color: 'bg-yellow-100 text-yellow-800' },
    'urgencia': { label: 'Urgencia', color: 'bg-red-100 text-red-800' }
  };

  ngOnInit() {
    console.log('🚀 CirugiaDetailComponent iniciando...');
    this.loadCirugia();
  }

  private loadCirugia() {
    this.loading.set(true);
    this.error.set(null);

    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          throw new Error('ID de cirugía no encontrado');
        }
        console.log('📋 Cargando cirugía con ID:', id);
        return this.cirugiasService.getCirugiaById(id);
      })
    ).subscribe({
      next: (cirugia) => {
        console.log('✅ Cirugía cargada:', cirugia);
        this.cirugia.set(cirugia);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading cirugia:', err);
        this.error.set('Error al cargar la cirugía: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  // ✅ Métodos de utilidad corregidos
  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatHora(hora: string | undefined | null): string {
    return hora || 'No especificada';
  }

  formatDuracion(minutos: number | undefined | null): string {
    if (!minutos) return 'No especificada';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  getEstadoInfo(estado: string) {
    return this.estadosInfo[estado as keyof typeof this.estadosInfo] || 
           { label: estado, color: 'bg-gray-100 text-gray-800', icon: '❓' };
  }

  getPrioridadInfo(prioridad: string) {
    return this.prioridadesInfo[prioridad as keyof typeof this.prioridadesInfo] || 
           { label: prioridad, color: 'bg-gray-100 text-gray-800' };
  }

  // Acciones
  editarCirugia() {
    const cirugia = this.cirugia();
    if (cirugia) {
      this.router.navigate(['/internal/agenda/editar', cirugia.id]);
    }
  }

  cambiarEstado() {
    const cirugia = this.cirugia();
    if (!cirugia) return;

    // Si ya está completada o cancelada, no permitir cambios
    if (cirugia.estado === 'completada' || cirugia.estado === 'cancelada') {
      alert('No se puede cambiar el estado de una cirugía completada o cancelada');
      return;
    }

    // ✅ Ciclo simple entre estados con tipado correcto
    let nuevoEstado: 'programada' | 'en_curso' | 'completada' | 'cancelada' | 'urgencia';
    switch (cirugia.estado) {
      case 'programada':
        nuevoEstado = 'en_curso';
        break;
      case 'en_curso':
        nuevoEstado = 'completada';
        break;
      case 'urgencia':
        nuevoEstado = 'en_curso';
        break;
      default:
        nuevoEstado = 'programada';
        break;
    }

    const estadoInfo = this.getEstadoInfo(nuevoEstado);
    if (confirm(`¿Cambiar estado a "${estadoInfo.label}"?`)) {
      this.loading.set(true);
      this.cirugiasService.updateCirugia(cirugia.id, { estado: nuevoEstado }).subscribe({
        next: (cirugiaActualizada) => {
          console.log('✅ Estado actualizado:', cirugiaActualizada);
          this.cirugia.set(cirugiaActualizada);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Error updating estado:', err);
          alert('Error al cambiar estado: ' + (err?.message || err));
          this.loading.set(false);
        }
      });
    }
  }

  volverAtras() {
    this.router.navigate(['/internal/agenda']);
  }

  recargarDatos() {
    this.loadCirugia();
  }

  // Método para compartir (futuro)
  compartirCirugia() {
    const cirugia = this.cirugia();
    if (!cirugia) return;

    if (navigator.share) {
      navigator.share({
        title: `Cirugía ${cirugia.numero_cirugia}`,
        text: `${cirugia.paciente_nombre} - ${cirugia.tipo_cirugia_data?.nombre}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Enlace copiado al portapapeles');
      }).catch(() => {
        alert('No se pudo copiar el enlace');
      });
    }
  }

  // Método para imprimir (futuro)
  imprimirDetalle() {
    window.print();
  }
}