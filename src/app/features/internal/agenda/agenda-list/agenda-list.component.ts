import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CirugiasService } from '../data-access/cirugias.service';
import { Cirugia } from '../data-access/models';
import { KitService } from '../../../../shared/services/kit.service';
import { EstadoDialogComponent } from '../cirugia-detail/estado-dialog.component';

@Component({
  selector: 'app-agenda-list',
  standalone: true,
  imports: [CommonModule, RouterModule, EstadoDialogComponent],
  templateUrl: './agenda-list.component.html',
  styleUrl: './agenda-list.component.css'
})
export class AgendaListComponent implements OnInit {
  
  // Signals para el estado del componente
  loading = signal(false);
  error = signal<string | null>(null);
  cirugias = signal<Cirugia[]>([]);
  kitstatus = signal<Record<string, boolean>>({});
  showEstadoDialog = signal(false);
  cirugiaSeleccionada = signal<Cirugia | null>(null);
  
  // Signals para filtros
  searchTerm = signal('');
  selectedEstado = signal('');
  selectedFecha = signal('');
  
  // Signals para vista de calendario
  viewMode = signal<'list' | 'calendar'>('list');
  currentMonth = signal(new Date());
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Computed para el label del mes actual
  currentMonthLabel = computed(() => {
    const date = this.currentMonth();
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  });

  // Computed para generar días del calendario
  calendarDays = computed(() => {
    const currentDate = this.currentMonth();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Primer y último día del mes
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Días para completar la primera semana
    const startPadding = firstDay.getDay();
    const endPadding = 6 - lastDay.getDay();
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: Cirugia[];
    }> = [];
    
    // Días del mes anterior
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    // Días del mes actual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    // Días del mes siguiente
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
    
    return days;
  });
  
  // Computed para cirugías filtradas
  filteredCirugias = computed(() => {
    let result = this.cirugias();
    
    // Filtro por búsqueda
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(cirugia => 
        this.getClienteNombre(cirugia).toLowerCase().includes(term) ||
        // ✅ Usar las relaciones FK en lugar de campos legacy
        (cirugia.hospital_data?.nombre || cirugia.hospital || '').toLowerCase().includes(term) ||
        (cirugia.tipo_cirugia_data?.nombre || cirugia.tipo_cirugia || '').toLowerCase().includes(term) ||
        cirugia.medico_cirujano.toLowerCase().includes(term) ||
        cirugia.numero_cirugia.toLowerCase().includes(term) ||
        (cirugia.tecnico_asignado?.full_name || '').toLowerCase().includes(term)
      );
    }
    
    // Filtro por estado
    if (this.selectedEstado()) {
      result = result.filter(cirugia => cirugia.estado === this.selectedEstado());
    }
    
    // Filtro por fecha
    if (this.selectedFecha()) {
      const fechaSeleccionada = this.selectedFecha();
      result = result.filter(cirugia => {
        const fechaCirugia = new Date(cirugia.fecha_programada).toISOString().split('T')[0];
        return fechaCirugia === fechaSeleccionada;
      });
    }
    
    return result;
  });

  private readonly cirugiasService = inject(CirugiasService);
  private readonly router = inject(Router);
  private readonly kitService = inject(KitService);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);
    
    this.cirugiasService.getCirugias().subscribe({
      next: (cirugias) => {
        this.cirugias.set(cirugias);
        this.verificarKitsStatus(cirugias);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar las cirugías. Por favor intenta nuevamente.');
        this.loading.set(false);
        console.error('Error loading cirugias:', err);
      }
    });
  }

  // Métodos para manejar cambios en filtros
  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  onEstadoChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedEstado.set(target.value);
  }

  onFechaChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.selectedFecha.set(target.value);
  }

  // ✅ Métodos helpers para obtener datos con fallback
  getHospitalNombre(cirugia: Cirugia): string {
    return cirugia.hospital_data?.nombre || cirugia.hospital || 'Hospital no especificado';
  }

  getHospitalCiudad(cirugia: Cirugia): string {
    return cirugia.hospital_data?.ciudad || 'Ciudad no especificada';
  }

  getTipoCirugiaNombre(cirugia: Cirugia): string {
    return cirugia.tipo_cirugia_data?.nombre || cirugia.tipo_cirugia || 'Tipo no especificado';
  }

  getTecnicoNombre(cirugia: Cirugia): string {
    return cirugia.tecnico_asignado?.full_name || 'Sin asignar';
  }

  getClienteNombre(cirugia: Cirugia): string {
    if (cirugia.cliente) {
      return `${cirugia.cliente.nombre} ${cirugia.cliente.apellido}`;
    }
    return 'Cliente no especificado';
  }

  getDuracionEstimada(cirugia: Cirugia): string {
    if (cirugia.duracion_estimada) {
      const horas = Math.floor(cirugia.duracion_estimada / 60);
      const minutos = cirugia.duracion_estimada % 60;
      if (horas > 0) {
        return `${horas}h ${minutos}m`;
      }
      return `${minutos}m`;
    }
    return cirugia.tipo_cirugia_data?.duracion_promedio 
      ? `~${cirugia.tipo_cirugia_data.duracion_promedio}m`
      : 'No estimada';
  }

  // Métodos para formateo y estilos
  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatFechaCorta(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    });
  }

  formatHora(hora?: string): string {
    if (!hora) return 'No programada';
    return hora.substring(0, 5); // HH:MM
  }

  getEstadoBadgeClass(estado: string): string {
    const baseClass = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (estado) {
      case 'programada':
        return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case 'en_curso':
        return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'completada':
        return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'cancelada':
        return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case 'urgencia':
        return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 animate-pulse`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'programada': return 'Programada';
      case 'en_curso': return 'En Curso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      case 'urgencia': return 'Urgencia';
      default: return estado;
    }
  }

  getPrioridadBadgeClass(prioridad: string): string {
    const baseClass = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (prioridad) {
      case 'alta':
        return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case 'urgencia':
        return `${baseClass} bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-200 animate-pulse`;
      case 'normal':
        return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'baja':
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  }

  getPrioridadLabel(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'Alta';
      case 'urgencia': return 'Urgencia';
      case 'normal': return 'Normal';
      case 'baja': return 'Baja';
      default: return prioridad;
    }
  }

  // ✅ Método mejorado para cambiar estado con diálogo
  cambiarEstado(cirugia: Cirugia, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Si ya está completada o cancelada, no permitir cambios
    if (cirugia.estado === 'completada' || cirugia.estado === 'cancelada') {
      return;
    }

    console.log('🔄 Abriendo diálogo para cambiar estado de:', cirugia.numero_cirugia);
    this.cirugiaSeleccionada.set(cirugia);
    this.showEstadoDialog.set(true);
  }

  onCambioEstadoCirugia(nuevoEstado: string) {
    const cirugia = this.cirugiaSeleccionada();
    if (!cirugia) return;

    const estadoValido = nuevoEstado as 'programada' | 'en_curso' | 'completada' | 'cancelada' | 'urgencia';
    
    console.log('🔄 Actualizando estado de cirugía:', cirugia.numero_cirugia, 'a', estadoValido);
    
    this.loading.set(true);
    this.cirugiasService.updateCirugia(cirugia.id, { estado: estadoValido }).subscribe({
      next: (cirugiaActualizada) => {
        console.log('✅ Estado actualizado:', cirugiaActualizada);
        this.showEstadoDialog.set(false);
        this.cirugiaSeleccionada.set(null);
        // Recargar la lista para reflejar los cambios
        this.loadData();
      },
      error: (err) => {
        console.error('❌ Error updating estado:', err);
        this.error.set('Error al actualizar el estado: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  closeEstadoDialog() {
    this.showEstadoDialog.set(false);
    this.cirugiaSeleccionada.set(null);
  }

  // ✅ Método para determinar si se puede cambiar estado
  canChangeEstado(estado: string): boolean {
    return estado === 'programada' || estado === 'en_curso';
  }

  // ✅ Método para obtener el siguiente estado
  getNextEstado(estado: string): string {
    switch (estado) {
      case 'programada': return 'Iniciar';
      case 'en_curso': return 'Completar';
      default: return '';
    }
  }

  // ✅ Método para determinar si una cirugía es urgente
  isUrgente(cirugia: Cirugia): boolean {
    return cirugia.estado === 'urgencia' || cirugia.prioridad === 'urgencia';
  }

  // ✅ Método para determinar si una cirugía está próxima (hoy o mañana)
  isProxima(cirugia: Cirugia): boolean {
    const hoy = new Date();
    const fechaCirugia = new Date(cirugia.fecha_programada);
    const diffTime = fechaCirugia.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 1 && diffDays >= 0;
  }

  // Computed para KPIs
  cirugiasProgramadas = computed(() => 
    this.cirugias().filter(c => c.estado === 'programada').length
  );

  cirugiasCurso = computed(() => 
    this.cirugias().filter(c => c.estado === 'en_curso').length
  );

  cirugiasFcompletadas = computed(() => 
    this.cirugias().filter(c => c.estado === 'completada').length
  );

  cirugiaUrgencia = computed(() => 
    this.cirugias().filter(c => c.estado === 'urgencia' || c.prioridad === 'urgencia').length
  );

  // ✅ Nuevos KPIs
  cirugiasCanceladas = computed(() => 
    this.cirugias().filter(c => c.estado === 'cancelada').length
  );

  cirugiasSinTecnico = computed(() => 
    this.cirugias().filter(c => !c.tecnico_asignado_id && c.estado === 'programada').length
  );

  cirugiaProximas = computed(() => 
    this.cirugias().filter(c => this.isProxima(c) && c.estado === 'programada').length
  );

  // ✅ Métodos de utilidad para el template
  clearFilters() {
    this.searchTerm.set('');
    this.selectedEstado.set('');
    this.selectedFecha.set('');
  }

  refreshData() {
    this.loadData();
  }

  // ✅ Estados disponibles para el filtro
  estadosDisponibles = [
    { value: '', label: 'Todos los estados' },
    { value: 'programada', label: 'Programada' },
    { value: 'en_curso', label: 'En Curso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'urgencia', label: 'Urgencia' }
  ];

  // Verificar estado de kits para todas las cirugías
  private verificarKitsStatus(cirugias: Cirugia[]) {
    const statusMap: Record<string, boolean> = {};
    
    // Verificar cada cirugía de forma paralela
    cirugias.forEach(cirugia => 
      this.kitService.tieneKit(cirugia.id).subscribe({
        next: (tieneKit) => {
          statusMap[cirugia.id] = tieneKit;
          this.kitstatus.set({ ...this.kitstatus(), ...statusMap });
        },
        error: () => {
          statusMap[cirugia.id] = false;
          this.kitstatus.set({ ...this.kitstatus(), ...statusMap });
        }
      })
    );
  }

  // Método para verificar si una cirugía tiene kit
  tieneKit(cirugiaId: string): boolean {
    return this.kitstatus()[cirugiaId] || false;
  }

  // Método actualizado para manejar kits (crear o ver detalles)
  async onManejarKit(cirugiaId: string) {
    try {
      // Verificar si ya existe un kit para esta cirugía
      const kit = await firstValueFrom(this.kitService.getKitPorCirugia(cirugiaId));
      
      if (kit) {
        // Si existe kit, ir a los detalles
        this.router.navigate(['/internal/agenda/kit-detail', kit.id]);
      } else {
        // Si no existe kit, ir a crearlo
        this.router.navigate(['/internal/agenda/kit-builder', cirugiaId]);
      }
    } catch (error) {
      console.error('Error verificando kit:', error);
      // En caso de error, ir a crear kit
      this.router.navigate(['/internal/agenda/kit-builder', cirugiaId]);
    }
  }

  // Método heredado para compatibilidad
  onCrearKit(cirugiaId: string) {
    this.onManejarKit(cirugiaId);
  }

  // Métodos para el calendario
  setViewMode(mode: 'list' | 'calendar') {
    this.viewMode.set(mode);
  }

  previousMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  getEventsForDate(date: Date): Cirugia[] {
    const dateStr = date.toISOString().split('T')[0];
    return this.filteredCirugias().filter(cirugia => {
      const cirugiaDate = new Date(cirugia.fecha_programada).toISOString().split('T')[0];
      return cirugiaDate === dateStr;
    });
  }

  getUrgenciaClass(cirugia: Cirugia): string {
    const isUrgent = cirugia.estado === 'urgencia' || cirugia.prioridad === 'urgencia';
    return isUrgent 
      ? 'bg-red-500/30 text-white border-red-400/50 hover:bg-red-500/50'
      : 'bg-[#0098A8]/40 text-white border-[#0098A8]/60 hover:bg-[#0098A8]/60';
  }

  navigateToCirugia(cirugia: Cirugia) {
    this.router.navigate(['/internal/agenda/detalle', cirugia.id]);
  }
}
