import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

interface ProductoValidacion {
  id: string;
  producto_id: string;
  nombre: string;
  codigo: string;
  cantidad_solicitada: number;
  cantidad_preparada: number;
  cantidad_recibida: number;
  conforme: boolean;
  observaciones: string;
  lote?: string;
  fecha_vencimiento?: string;
}

interface KitDetalle {
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
      direccion: string;
    };
    cliente: {
      nombre: string;
      apellido: string;
    };
  };
}

@Component({
  selector: 'app-tecnico-validacion-kit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tecnico-validacion-kit.component.html',
  styleUrl: './tecnico-validacion-kit.component.css'
})
export class TecnicoValidacionKitComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);

  // Signals
  kitId = signal<string>('');
  kit = signal<KitDetalle | null>(null);
  productos = signal<ProductoValidacion[]>([]);
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  observacionesGenerales = signal<string>('');

  // Computed
  totalProductos = computed(() => this.productos().length);
  productosConformes = computed(() => this.productos().filter(p => p.conforme).length);
  productosNoConformes = computed(() => this.productos().filter(p => !p.conforme).length);
  todosValidados = computed(() => {
    const prods = this.productos();
    return prods.length > 0 && prods.every(p => p.cantidad_recibida !== null && p.cantidad_recibida !== undefined);
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.kitId.set(id);
      await this.cargarKit();
    }
  }

  async cargarKit() {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const kitId = this.kitId();

      // 1. Cargar datos del kit
      const { data: kitData, error: kitError } = await this.supabase.client
        .from('kits_cirugia')
        .select(`
          id,
          numero_kit,
          estado,
          fecha_recepcion,
          cirugias!inner (
            numero_cirugia,
            fecha_programada,
            medico_cirujano,
            hospitales (
              nombre,
              ciudad,
              direccion
            ),
            clientes (
              nombre,
              apellido
            )
          )
        `)
        .eq('id', kitId)
        .single();

      if (kitError) throw kitError;

      // Extraer el primer elemento de los arrays (es una relación 1 a 1)
      const cirugia = kitData.cirugias as any;
      const hospital = cirugia.hospitales as any;
      const cliente = cirugia.clientes as any;

      const kit: KitDetalle = {
        id: kitData.id,
        numero_kit: kitData.numero_kit,
        estado: kitData.estado,
        fecha_recepcion: kitData.fecha_recepcion,
        cirugia: {
          numero_cirugia: cirugia.numero_cirugia,
          fecha_programada: cirugia.fecha_programada,
          medico_cirujano: cirugia.medico_cirujano,
          hospital: {
            nombre: hospital?.nombre || 'N/A',
            ciudad: hospital?.ciudad || 'N/A',
            direccion: hospital?.direccion || 'N/A'
          },
          cliente: {
            nombre: cliente?.nombre || 'N/A',
            apellido: cliente?.apellido || ''
          }
        }
      };

      this.kit.set(kit);

      // 2. Cargar productos del kit
      const { data: productosData, error: productosError } = await this.supabase.client
        .from('kit_productos')
        .select(`
          id,
          producto_id,
          cantidad_solicitada,
          cantidad_preparada,
          cantidad_enviada,
          lote,
          fecha_vencimiento,
          observaciones,
          productos (
            nombre,
            codigo
          )
        `)
        .eq('kit_id', kitId)
        .order('productos(nombre)');

      if (productosError) throw productosError;

      const productos: ProductoValidacion[] = (productosData || []).map((p: any) => ({
        id: p.id,
        producto_id: p.producto_id,
        nombre: p.productos?.nombre || 'N/A',
        codigo: p.productos?.codigo || 'N/A',
        cantidad_solicitada: p.cantidad_solicitada || 0,
        cantidad_preparada: p.cantidad_preparada || 0,
        cantidad_recibida: p.cantidad_enviada || p.cantidad_preparada || 0, // Inicializar con cantidad_enviada o preparada
        conforme: true, // Por defecto conforme
        observaciones: '',
        lote: p.lote,
        fecha_vencimiento: p.fecha_vencimiento
      }));

      this.productos.set(productos);

    } catch (err: any) {
      console.error('Error cargando kit:', err);
      this.error.set('Error al cargar los datos del kit');
    } finally {
      this.cargando.set(false);
    }
  }

  actualizarCantidad(productoId: string, cantidad: number) {
    const prods = this.productos();
    const index = prods.findIndex(p => p.id === productoId);
    if (index !== -1) {
      const updated = [...prods];
      updated[index] = {
        ...updated[index],
        cantidad_recibida: cantidad,
        conforme: cantidad === updated[index].cantidad_preparada
      };
      this.productos.set(updated);
    }
  }

  toggleConforme(productoId: string) {
    const prods = this.productos();
    const index = prods.findIndex(p => p.id === productoId);
    if (index !== -1) {
      const updated = [...prods];
      updated[index] = {
        ...updated[index],
        conforme: !updated[index].conforme
      };
      this.productos.set(updated);
    }
  }

  actualizarObservaciones(productoId: string, observaciones: string) {
    const prods = this.productos();
    const index = prods.findIndex(p => p.id === productoId);
    if (index !== -1) {
      const updated = [...prods];
      updated[index] = {
        ...updated[index],
        observaciones
      };
      this.productos.set(updated);
    }
  }

  marcarTodosConformes() {
    const updated = this.productos().map(p => ({
      ...p,
      cantidad_recibida: p.cantidad_preparada,
      conforme: true
    }));
    this.productos.set(updated);
  }

  async confirmarValidacion() {
    if (!this.todosValidados()) {
      alert('Por favor valide la cantidad recibida de todos los productos');
      return;
    }

    if (!confirm('¿Confirmar validación de recepción?\nEsto marcará el kit como validado y listo para usar.')) {
      return;
    }

    this.procesando.set(true);

    try {
      const kitId = this.kitId();
      const { data: { user } } = await this.supabase.client.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // 1. Actualizar cada producto con la cantidad recibida (usando cantidad_enviada)
      for (const producto of this.productos()) {
        const { error: updateError } = await this.supabase.client
          .from('kit_productos')
          .update({
            cantidad_enviada: producto.cantidad_recibida, // Guardamos en cantidad_enviada
            observaciones: producto.observaciones || null
          })
          .eq('id', producto.id);

        if (updateError) throw updateError;
      }

      // 2. Actualizar estado del kit a 'validado'
      const { error: kitUpdateError } = await this.supabase.client
        .from('kits_cirugia')
        .update({
          estado: 'validado',
          updated_at: new Date().toISOString()
        })
        .eq('id', kitId);

      if (kitUpdateError) throw kitUpdateError;

      // 3. Registrar en trazabilidad
      const productosNoConformesData = this.productos().filter(p => !p.conforme);
      
      await this.supabase.client
        .from('kit_trazabilidad')
        .insert({
          kit_id: kitId,
          accion: 'Recepción validada por técnico',
          estado_anterior: 'entregado',
          estado_nuevo: 'validado',
          usuario_id: user.id,
          timestamp: new Date().toISOString(),
          observaciones: this.observacionesGenerales() || 'Recepción validada sin observaciones',
          metadata: {
            productos_conformes: this.productosConformes(),
            productos_no_conformes: this.productosNoConformes(),
            total_productos: this.totalProductos(),
            anomalias: productosNoConformesData.map(p => ({
              producto: p.nombre,
              cantidad_esperada: p.cantidad_preparada,
              cantidad_recibida: p.cantidad_recibida,
              observaciones: p.observaciones
            }))
          }
        });

      alert('✅ Validación completada exitosamente');
      this.router.navigate(['/internal/tecnico']);

    } catch (err: any) {
      console.error('Error validando kit:', err);
      alert('Error al validar el kit. Por favor intente nuevamente.');
    } finally {
      this.procesando.set(false);
    }
  }

  volver() {
    this.router.navigate(['/internal/tecnico']);
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getDiferencia(producto: ProductoValidacion): number {
    return producto.cantidad_recibida - producto.cantidad_preparada;
  }

  getDiferenciaClass(diferencia: number): string {
    if (diferencia === 0) return 'text-green-400';
    if (diferencia > 0) return 'text-blue-400';
    return 'text-red-400';
  }
}
