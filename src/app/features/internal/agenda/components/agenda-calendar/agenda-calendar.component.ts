import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface CirugiaEvent {
  id: string;
  titulo: string;
  fecha: Date;
  horaInicio: string;
  horaFin?: string;
  cirujano: string;
  paciente: string;
  tipoUrgencia: 'programada' | 'urgente';
  estado: 'programada' | 'en_curso' | 'completada' | 'cancelada' | 'urgencia';
  institucion: string;
  tecnicoAsignado?: string;
  materialRequerido: string[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CirugiaEvent[];
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
  currentView = signal<'month' | 'week' | 'day'>('month');
  currentDate = signal(new Date());
  selectedEvent = signal<CirugiaEvent | null>(null);
  
  // Datos de ejemplo
  cirugias = signal<CirugiaEvent[]>([
    {
      id: '1',
      titulo: 'Osteosíntesis Fémur Izquierdo',
      fecha: new Date(2025, 8, 25), // 25 septiembre 2025
      horaInicio: '08:00',
      horaFin: '10:00',
      cirujano: 'García López',
      paciente: 'Juan Carlos Pérez',
      tipoUrgencia: 'programada',
      estado: 'programada',
      institucion: 'Hospital San José',
      tecnicoAsignado: 'Carlos López Técnico',
      materialRequerido: ['Placa DCP 4.5mm', 'Tornillos Corticales', 'Guías de Perforación']
    },
    {
      id: '2',
      titulo: 'Fractura Tibia - EMERGENCIA',
      fecha: new Date(2025, 8, 23), // 23 septiembre 2025 (hoy)
      horaInicio: '14:30',
      horaFin: '16:30',
      cirujano: 'Martínez Silva',
      paciente: 'Ana María González',
      tipoUrgencia: 'urgente',
      estado: 'urgencia',
      institucion: 'Clínica Los Andes',
      materialRequerido: ['Sistema Ilizarov', 'Fijador Externo', 'Material de Osteosíntesis']
    },
    {
      id: '3',
      titulo: 'Artroscopia de Rodilla',
      fecha: new Date(2025, 8, 24), // 24 septiembre 2025
      horaInicio: '10:00',
      horaFin: '11:30',
      cirujano: 'Rodriguez Muñoz',
      paciente: 'Pedro Antonio Ruiz',
      tipoUrgencia: 'programada',
      estado: 'programada',
      institucion: 'Centro Médico Nacional',
      tecnicoAsignado: 'María Fernanda Tech',
      materialRequerido: ['Set Artroscopia', 'Cámara HD', 'Instrumental Específico']
    },
    {
      id: '4',
      titulo: 'Fijación Columna Vertebral',
      fecha: new Date(2025, 8, 26), // 26 septiembre 2025
      horaInicio: '07:00',
      horaFin: '12:00',
      cirujano: 'Hernández Castro',
      paciente: 'Luis Eduardo Morales',
      tipoUrgencia: 'programada',
      estado: 'programada',
      institucion: 'Hospital Universitario',
      materialRequerido: ['Sistema de Fijación Spinal', 'Tornillos Pediculares', 'Barras de Titanio']
    }
  ]);

  alerts = signal<Alert[]>([
    {
      tipo: 'urgente',
      titulo: 'Material Faltante',
      mensaje: 'Set de columna no disponible para cirugía de las 07:00 del 26/09',
      tiempo: '5 min'
    },
    {
      tipo: 'info',
      titulo: 'Técnico Confirmado',
      mensaje: 'Carlos López confirmado para osteosíntesis de mañana',
      tiempo: '15 min'
    },
    {
      tipo: 'advertencia',
      titulo: 'Cambio de Horario',
      mensaje: 'Artroscopia movida de 09:00 a 10:00 - Confirmar con equipo',
      tiempo: '30 min'
    }
  ]);

  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  hours = Array.from({length: 14}, (_, i) => i + 6); // 6 AM a 8 PM

  ngOnInit() {
    this.loadCirugias();
  }

  loadCirugias() {
    // Cargar cirugías desde el servicio
    console.log('Cargando cirugías...');
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

  getEventsForDate(date: Date): CirugiaEvent[] {
    return this.cirugias().filter(cirugia => 
      cirugia.fecha.toDateString() === date.toDateString()
    );
  }

  getEventsForHour(hour: number): CirugiaEvent[] {
    const currentDate = this.currentDate();
    return this.cirugias().filter(cirugia => {
      if (cirugia.fecha.toDateString() !== currentDate.toDateString()) return false;
      const eventHour = parseInt(cirugia.horaInicio.split(':')[0]);
      return eventHour === hour;
    });
  }

  getEventsForDayHour(dayIndex: number, hour: number): CirugiaEvent[] {
    const weekDays = this.getWeekDays();
    const targetDay = weekDays[dayIndex];
    
    return this.cirugias().filter(cirugia => {
      if (cirugia.fecha.toDateString() !== targetDay.toDateString()) return false;
      const eventHour = parseInt(cirugia.horaInicio.split(':')[0]);
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

  selectEvent(event: CirugiaEvent) {
    this.selectedEvent.set(event);
    console.log('Evento seleccionado:', event);
    // Aquí podrías abrir un modal o navegar al detalle
  }
}