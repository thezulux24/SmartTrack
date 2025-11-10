import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CirugiasService } from '../../data-access/cirugias.service';
import { Cirugia } from '../../data-access/models';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Cirugia[];
}

interface Alert {
  tipo: 'urgente' | 'info' | 'advertencia';
  titulo: string;
  mensaje: string;
  tiempo: string;
}

@Component({
  selector: 'app-agenda-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './agenda-calendar.component.html'
})
export class AgendaCalendarComponent implements OnInit {
  private cirugiasService = inject(CirugiasService);

  // Signals para el estado
  currentView = signal<'month' | 'week' | 'day'>('month');
  currentDate = signal(new Date());
  selectedEvent = signal<Cirugia | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Datos reales
  cirugias = signal<Cirugia[]>([]);

  // Alertas generadas basadas en las cirugías reales
  alerts = computed<Alert[]>(() => {
    const alerts: Alert[] = [];
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    this.cirugias().forEach(cirugia => {
      // Alertas de urgencia
      if (cirugia.estado === 'urgencia' || cirugia.prioridad === 'urgencia') {
        alerts.push({
          tipo: 'urgente',
          titulo: 'Cirugía de Urgencia',
          mensaje: `${this.getClienteNombre(cirugia)} - ${this.getTipoCirugiaNombre(cirugia)}`,
          tiempo: this.getTimeAgo(cirugia.created_at || '')
        });
      }

      // Alertas de cirugías sin técnico asignado para mañana
      if (!cirugia.tecnico_asignado_id && this.isTomorrow(cirugia.fecha_programada)) {
        alerts.push({
          tipo: 'advertencia',
          titulo: 'Sin Técnico Asignado',
          mensaje: `Cirugía de ${this.getClienteNombre(cirugia)} no tiene técnico asignado`,
          tiempo: 'Mañana'
        });
      }

      // Cirugías próximas (hoy)
      if (this.isToday(new Date(cirugia.fecha_programada)) && cirugia.estado === 'programada') {
        alerts.push({
          tipo: 'info',
          titulo: 'Cirugía Programada Hoy',
          mensaje: `${this.getClienteNombre(cirugia)} - ${this.formatHora(cirugia.hora_inicio)}`,
          tiempo: 'Hoy'
        });
      }
    });

    return alerts.slice(0, 5); // Máximo 5 alertas
  });

  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  hours = Array.from({ length: 24 }, (_, i) => i); // 00:00 a 23:00

  // Nuevo signal para controlar el modal
  showModal = signal(false);
  selectedEventDetails = signal<Cirugia | null>(null);

  ngOnInit() {
    this.loadCirugias();
  }

  loadCirugias() {
    this.loading.set(true);
    this.error.set(null);
    
    this.cirugiasService.getCirugias().subscribe({
      next: (cirugias) => {
        this.cirugias.set(cirugias);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading cirugias for calendar:', err);
        this.error.set('Error al cargar las cirugías');
        this.loading.set(false);
      }
    });
  }

  calendarDays = computed((): CalendarDay[] => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayEvents = this.getEventsForDate(current);
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: this.isToday(current),
        events: dayEvents
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  });

  getEventsForDate(date: Date): Cirugia[] {
    return this.cirugias().filter(cirugia => {
      const cirugiaDate = new Date(cirugia.fecha_programada);
      return cirugiaDate.toDateString() === date.toDateString();
    });
  }

  getEventsForHour(hour: number): Cirugia[] {
    const currentDate = this.currentDate();
    return this.cirugias().filter(cirugia => {
      const cirugiaDate = new Date(cirugia.fecha_programada);
      if (cirugiaDate.toDateString() !== currentDate.toDateString()) return false;
      
      if (!cirugia.hora_inicio) return false;
      const eventHour = parseInt(cirugia.hora_inicio.split(':')[0]);
      return eventHour === hour;
    });
  }

  getEventsForDayHour(dayIndex: number, hour: number): Cirugia[] {
    const weekDays = this.getWeekDays();
    const targetDay = weekDays[dayIndex];
    
    return this.cirugias().filter(cirugia => {
      const cirugiaDate = new Date(cirugia.fecha_programada);
      if (cirugiaDate.toDateString() !== targetDay.toDateString()) return false;
      
      if (!cirugia.hora_inicio) return false;
      const eventHour = parseInt(cirugia.hora_inicio.split(':')[0]);
      return eventHour === hour;
    });
  }

  getWeekDays(): Date[] {
    const current = new Date(this.currentDate());
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - current.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isTomorrow(dateString: string): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = new Date(dateString);
    return date.toDateString() === tomorrow.toDateString();
  }

  getCurrentPeriodTitle(): string {
    const date = this.currentDate();
    const view = this.currentView();
    
    switch (view) {
      case 'month':
        return date.toLocaleDateString('es-ES', { 
          month: 'long', 
          year: 'numeric' 
        });
      case 'week':
        const weekStart = this.getWeekDays()[0];
        const weekEnd = this.getWeekDays()[6];
        return `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      case 'day':
        return date.toLocaleDateString('es-ES', { 
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      default:
        return '';
    }
  }

  getCurrentDayDate(): string {
    const date = this.currentDate();
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getStatusLabel(estado: string): string {
    const labels: {[key: string]: string} = {
      'programada': 'Programada',
      'en_curso': 'En Curso',
      'completada': 'Completada',
      'cancelada': 'Cancelada',
      'urgencia': 'Urgencia'
    };
    return labels[estado] || estado;
  }

  formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  formatHora(hora?: string): string {
    if (!hora) return 'Sin hora';
    return hora.substring(0, 5); // HH:MM
  }

  setView(view: 'month' | 'week' | 'day') {
    this.currentView.set(view);
  }

  previousPeriod() {
    const current = new Date(this.currentDate());
    const view = this.currentView();
    
    switch (view) {
      case 'month':
        current.setMonth(current.getMonth() - 1);
        break;
      case 'week':
        current.setDate(current.getDate() - 7);
        break;
      case 'day':
        current.setDate(current.getDate() - 1);
        break;
    }
    
    this.currentDate.set(current);
  }

  nextPeriod() {
    const current = new Date(this.currentDate());
    const view = this.currentView();
    
    switch (view) {
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
    }
    
    this.currentDate.set(current);
  }

  selectEvent(event: Cirugia) {
    this.selectedEventDetails.set(event);
    this.showModal.set(true);
    console.log('Evento seleccionado:', event);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedEventDetails.set(null);
  }

  // Método para navegar al detalle/edición
  navigateToEvent(event: Cirugia) {
    // Aquí puedes navegar al formulario de edición
    // this.router.navigate(['/internal/agenda/editar', event.id]);
    this.closeModal();
  }

  // Métodos helper para obtener datos con fallback (igual que en agenda-list)
  getHospitalNombre(cirugia: Cirugia): string {
    return cirugia.hospital_data?.nombre || 'Hospital no especificado';
  }

  getTipoCirugiaNombre(cirugia: Cirugia): string {
    return cirugia.tipo_cirugia_data?.nombre || 'Tipo no especificado';
  }

  getTecnicoNombre(cirugia: Cirugia): string {
    return cirugia.tecnico_asignado?.full_name || 'Sin asignar';
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
    return 'No estimada';
  }

  getTimeAgo(dateString: string): string {
    if (!dateString) return 'Reciente';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  }

  // Determinar el tipo de urgencia basado en el estado y prioridad
  getTipoUrgencia(cirugia: Cirugia): 'programada' | 'urgente' {
    return (cirugia.estado === 'urgencia' || cirugia.prioridad === 'urgencia') ? 'urgente' : 'programada';
  }

  // Obtener la hora de fin estimada
  getHoraFin(cirugia: Cirugia): string {
    if (!cirugia.hora_inicio || !cirugia.duracion_estimada) return '';
    
    const [horas, minutos] = cirugia.hora_inicio.split(':').map(Number);
    const inicioEnMinutos = horas * 60 + minutos;
    const finEnMinutos = inicioEnMinutos + cirugia.duracion_estimada;
    
    const horaFin = Math.floor(finEnMinutos / 60);
    const minutosFin = finEnMinutos % 60;
    
    return `${horaFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
  }

  refreshData() {
    this.loadCirugias();
  }

  // Métodos helper para obtener información del cliente
  getClienteNombre(cirugia: Cirugia): string {
    if (cirugia.cliente) {
      return `${cirugia.cliente.nombre} ${cirugia.cliente.apellido}`;
    }
    return 'Cliente no especificado';
  }

  getClienteDocumento(cirugia: Cirugia): string | null {
    if (cirugia.cliente) {
      return `${cirugia.cliente.documento_tipo}: ${cirugia.cliente.documento_numero}`;
    }
    return null;
  }

  getClienteTelefono(cirugia: Cirugia): string | null {
    if (cirugia.cliente) {
      return cirugia.cliente.telefono || null;
    }
    return null;
  }
}