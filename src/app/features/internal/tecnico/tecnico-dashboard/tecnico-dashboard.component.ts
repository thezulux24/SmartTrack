import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { KitService } from '../../../../shared/services/kit.service';

interface KitPendiente {
  id: string;
  numero_kit: string;
  estado: string;
  fecha_recepcion: string;
  cirugia: {
    numero_cirugia: string;
    fecha_programada: string;
    medico_cirujano: string;
    hospital: {
      nombre: string;
      ciudad: string;
    };
    cliente: {
      nombre: string;
      apellido: string;
    };
  };
  productos_count?: number;
}

@Component({
  selector: 'app-tecnico-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tecnico-dashboard.component.html',
  styleUrl: './tecnico-dashboard.component.css'
})
export class TecnicoDashboardComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private kitService = inject(KitService);

  // Signals
  kitsPendientes = signal<KitPendiente[]>([]);
  kitsValidados = signal<KitPendiente[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  tecnicoId = signal<string | null>(null);
  tecnicoNombre = signal<string>('');

  // Computed
  totalPendientes = computed(() => this.kitsPendientes().length);
  totalValidados = computed(() => this.kitsValidados().length);

  async ngOnInit() {
    await this.cargarDatosTecnico();
    if (this.tecnicoId()) {
      await this.cargarKits();
    }
  }

  async cargarDatosTecnico() {
    try {
      // Obtener el ID del usuario actual usando el mismo método que agenda
      const currentUserId = await this.supabase.getCurrentUserId();
      
      if (!currentUserId) {
        console.error('No se pudo obtener el ID del usuario');
        this.error.set('No se pudo identificar al técnico. Por favor inicie sesión nuevamente.');
        return;
      }

      console.log('Usuario actual ID:', currentUserId);

      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', currentUserId)
        .single();

      if (profileError) {
        console.error('Error obteniendo perfil:', profileError);
        this.error.set('Error al obtener información del técnico');
        return;
      }

      if (profile) {
        this.tecnicoId.set(profile.id);
        this.tecnicoNombre.set(profile.full_name || 'Técnico');
        console.log('Técnico cargado:', profile);
      }
    } catch (error) {
      console.error('Error cargando datos del técnico:', error);
      this.error.set('Error al cargar datos del técnico');
    }
  }

  async cargarKits() {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const tecnicoId = this.tecnicoId();
      if (!tecnicoId) {
        this.error.set('No se pudo identificar al técnico');
        this.cargando.set(false);
        return;
      }

      console.log('Cargando kits para técnico:', tecnicoId);

      // Obtener kits donde el técnico está asignado a la cirugía
      const { data: kitsData, error: kitsError } = await this.supabase.client
        .from('kits_cirugia')
        .select(`
          id,
          numero_kit,
          estado,
          fecha_recepcion,
          cirugia_id,
          cirugias (
            id,
            numero_cirugia,
            fecha_programada,
            medico_cirujano,
            tecnico_asignado_id,
            hospital_id,
            cliente_id,
            hospitales (
              nombre,
              ciudad
            ),
            clientes (
              nombre,
              apellido
            )
          )
        `)
        .in('estado', ['entregado', 'validado', 'en_uso'])
        .order('fecha_recepcion', { ascending: false });

      if (kitsError) {
        console.error('Error en consulta de kits:', kitsError);
        throw kitsError;
      }

      console.log('Kits obtenidos:', kitsData);

      // Filtrar kits donde cirugias.tecnico_asignado_id coincide con el técnico actual
      const kitsFiltrados = (kitsData || []).filter((kit: any) => {
        const cirugia = kit.cirugias;
        return cirugia && cirugia.tecnico_asignado_id === tecnicoId;
      });

      console.log('Kits filtrados para este técnico:', kitsFiltrados);

      // Contar productos por kit
      const kitsConProductos = await Promise.all(
        kitsFiltrados.map(async (kit: any) => {
          const { count } = await this.supabase.client
            .from('kit_productos')
            .select('*', { count: 'exact', head: true })
            .eq('kit_id', kit.id);

          const cirugia = kit.cirugias;
          const hospital = cirugia?.hospitales;
          const cliente = cirugia?.clientes;

          return {
            id: kit.id,
            numero_kit: kit.numero_kit,
            estado: kit.estado,
            fecha_recepcion: kit.fecha_recepcion,
            cirugia: {
              numero_cirugia: cirugia?.numero_cirugia || 'N/A',
              fecha_programada: cirugia?.fecha_programada || '',
              medico_cirujano: cirugia?.medico_cirujano || 'N/A',
              hospital: {
                nombre: hospital?.nombre || 'N/A',
                ciudad: hospital?.ciudad || 'N/A'
              },
              cliente: {
                nombre: cliente?.nombre || 'N/A',
                apellido: cliente?.apellido || ''
              }
            },
            productos_count: count || 0
          };
        })
      );

      console.log('Kits con productos:', kitsConProductos);

      // Separar pendientes de validados
      const pendientes = kitsConProductos.filter(k => k.estado === 'entregado');
      const validados = kitsConProductos.filter(k => ['validado', 'en_uso'].includes(k.estado));

      this.kitsPendientes.set(pendientes);
      this.kitsValidados.set(validados);

    } catch (err: any) {
      console.error('Error cargando kits:', err);
      this.error.set('Error al cargar los kits asignados');
    } finally {
      this.cargando.set(false);
    }
  }

  validarKit(kitId: string) {
    this.router.navigate(['/internal/tecnico/validar-kit', kitId]);
  }

  verDetalleKit(kitId: string) {
    this.router.navigate(['/internal/tecnico/validar-kit', kitId]);
  }

  regresar() {
    this.router.navigate(['/internal']);
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatearFechaHora(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'entregado':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
      case 'validado':
        return 'bg-green-500/20 text-green-300 border-green-500';
      case 'en_uso':
        return 'bg-blue-500/20 text-blue-300 border-blue-500';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'entregado':
        return 'Pendiente Validación';
      case 'validado':
        return 'Validado';
      case 'en_uso':
        return 'En Uso';
      default:
        return estado;
    }
  }
}
