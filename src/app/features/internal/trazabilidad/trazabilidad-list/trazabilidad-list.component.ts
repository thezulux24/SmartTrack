import { Component, inject, signal, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TrazabilidadService } from '../../../../shared/services';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { TrazabilidadCompleta, TipoEntidadTrazabilidad } from '../../../../shared/models/trazabilidad.model';

interface Cirugia {
  id: string;
  numero_cirugia: string;
  fecha_programada: string;
  estado: string;
  cliente?: { nombre: string; apellido: string; };
  hospital?: { nombre: string; };
  medico_cirujano?: string;
}

@Component({
  selector: 'app-trazabilidad-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './trazabilidad-list.component.html',
  styleUrl: './trazabilidad-list.component.css'
})
export class TrazabilidadListComponent implements OnInit {
  private trazabilidadService = inject(TrazabilidadService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  
  // Exponer Object para uso en templates
  Object = Object;
  
  // Vista: 'seleccion' | 'detalle'
  vistaActual = signal<'seleccion' | 'detalle'>('seleccion');
  cirugiaSeleccionada = signal<Cirugia | null>(null);
  
  // Listas para selección
  cirugias = signal<Cirugia[]>([]);
  
  // Trazabilidad de la cirugía seleccionada (incluye sus kits)
  eventos = signal<TrazabilidadCompleta[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Búsqueda
  busqueda = signal('');

  ngOnInit(): void {
    this.cargarCirugias();
  }

  async cargarCirugias(): Promise<void> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('cirugias')
        .select(`
          id,
          numero_cirugia,
          fecha_programada,
          estado,
          medico_cirujano,
          cliente:clientes!inner(nombre, apellido),
          hospital:hospitales(nombre)
        `)
        .order('fecha_programada', { ascending: false })
        .limit(50);

      if (error) throw error;
      this.cirugias.set((data || []) as any);
    } catch (err) {
      console.error('Error al cargar cirugías:', err);
      this.error.set('Error al cargar las cirugías');
    } finally {
      this.loading.set(false);
    }
  }

  seleccionarCirugia(cirugia: Cirugia): void {
    this.cirugiaSeleccionada.set(cirugia);
    this.vistaActual.set('detalle');
    this.cargarTrazabilidadCirugia(cirugia.id);
  }

  cargarTrazabilidadCirugia(cirugiaId: string): void {
    this.loading.set(true);
    this.error.set(null);
    
    // getTimelineCirugia trae el historial completo: cirugía + todos sus kits
    this.trazabilidadService.getTimelineCirugia(cirugiaId).subscribe({
      next: (data) => {
        this.eventos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar trazabilidad:', err);
        this.error.set('Error al cargar el historial');
        this.loading.set(false);
      }
    });
  }

  volver(): void {
    this.vistaActual.set('seleccion');
    this.cirugiaSeleccionada.set(null);
    this.eventos.set([]);
  }

  volverAlMenu(): void {
    this.router.navigate(['/internal']);
  }

  // Utilidades
  formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerIconoAccion(accion: string): string {
    const iconos: { [key: string]: string } = {
      'cirugia_creada': '➕',
      'cirugia_iniciada': '▶️',
      'cirugia_finalizada': '✅',
      'cirugia_cancelada': '❌',
      'kit_creado': '📦',
      'kit_aprobado': '✅',
      'kit_rechazado': '❌',
      'preparacion_iniciada': '🔧',
      'producto_agregado': '➕',
      'kit_listo': '✅',
      'kit_despachado': '🚚',
      'kit_en_transito': '🚛',
      'kit_entregado': '📍',
      'kit_en_uso': '🔬',
      'kit_devuelto': '↩️',
      'qr_escaneado': '📷',
      'estado_cambiado': '🔄',
      'tecnico_asignado': '👤',
      'kit_asignado': '📦',
      'fecha_reprogramada': '📅'
    };
    return iconos[accion] || '📄';
  }

  obtenerColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'programada': 'bg-[#0098A8] text-white',
      'en_proceso': 'bg-[#C8D900] text-[#10284C]',
      'finalizada': 'bg-[#C8D900] text-[#10284C]',
      'cancelada': 'bg-red-500 text-white',
      'solicitado': 'bg-[#C8D900] text-[#10284C]',
      'preparando': 'bg-[#0098A8] text-white',
      'listo_envio': 'bg-[#C8D900] text-[#10284C]',
      'en_transito': 'bg-[#0098A8] text-white',
      'entregado': 'bg-[#C8D900] text-[#10284C]',
      'en_uso': 'bg-[#0098A8] text-white',
      'devuelto': 'bg-white/20 text-white',
      'finalizado': 'bg-[#C8D900] text-[#10284C]'
    };
    return colores[estado] || 'bg-white/20 text-white';
  }

  obtenerNombreCliente(cirugia: Cirugia): string {
    if (!cirugia.cliente) return 'N/A';
    return `${cirugia.cliente.nombre} ${cirugia.cliente.apellido}`;
  }

  obtenerTextoAccion(accion: string): string {
    return accion.replace(/_/g, ' ').split(' ').map(palabra => 
      palabra.charAt(0).toUpperCase() + palabra.slice(1)
    ).join(' ');
  }

  get cirugiasFiltradas(): Cirugia[] {
    const busqueda = this.busqueda().toLowerCase();
    if (!busqueda) return this.cirugias();
    
    return this.cirugias().filter(c => 
      c.numero_cirugia.toLowerCase().includes(busqueda) ||
      c.medico_cirujano?.toLowerCase().includes(busqueda) ||
      this.obtenerNombreCliente(c).toLowerCase().includes(busqueda) ||
      c.hospital?.nombre?.toLowerCase().includes(busqueda)
    );
  }
}
