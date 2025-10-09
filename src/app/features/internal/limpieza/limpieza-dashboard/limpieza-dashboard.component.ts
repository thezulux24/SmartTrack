import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

interface ProductoLimpieza {
  id: string; // kit_productos_limpieza.id
  kit_producto_id: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string;
  cantidad_a_recuperar: number;
  cantidad_aprobada: number;
  estado_limpieza: 'pendiente' | 'en_proceso' | 'esterilizado' | 'aprobado' | 'desechado';
  notas: string;
  observaciones_limpieza: string;
}

interface KitLimpieza {
  id: string;
  numero_kit: string;
  cirugia_id: string;
  fecha_inicio_limpieza: string;
  estado: string;
  hospital?: { nombre: string };
  medico_cirujano?: string;
  cliente?: { nombre: string; apellido: string };
  productos: ProductoLimpieza[];
  productos_count: number;
}

@Component({
  selector: 'app-limpieza-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './limpieza-dashboard.component.html',
  styleUrl: './limpieza-dashboard.component.css'
})
export class LimpiezaDashboardComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  kitsEnLimpieza = signal<KitLimpieza[]>([]);
  kitSeleccionado = signal<KitLimpieza | null>(null);
  cargando = signal<boolean>(true);
  procesando = signal<boolean>(false);
  error = signal<string>('');
  usuarioId = signal<string>('');

  totalKits = computed(() => this.kitsEnLimpieza().length);
  totalProductosPendientes = computed(() => {
    return this.kitsEnLimpieza().reduce((sum, kit) => {
      return sum + kit.productos.filter(p => p.estado_limpieza === 'pendiente').length;
    }, 0);
  });
  totalProductosEnProceso = computed(() => {
    return this.kitsEnLimpieza().reduce((sum, kit) => {
      return sum + kit.productos.filter(p => p.estado_limpieza === 'en_proceso').length;
    }, 0);
  });
  totalProductosEsterilizados = computed(() => {
    return this.kitsEnLimpieza().reduce((sum, kit) => {
      return sum + kit.productos.filter(p => p.estado_limpieza === 'esterilizado').length;
    }, 0);
  });

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando.set(true);
      this.error.set('');

      const supabase = this.supabaseService.supabaseClient;

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.usuarioId.set(user.id);
      }

      // Cargar kits en estado 'en_limpieza'
      const { data: kitsData, error: kitsError } = await supabase
        .from('kits_cirugia')
        .select(`
          id,
          numero_kit,
          cirugia_id,
          estado,
          fecha_inicio_limpieza,
          cirugias!inner(
            id,
            medico_cirujano,
            hospitales(nombre),
            clientes(nombre, apellido)
          )
        `)
        .eq('estado', 'en_limpieza')
        .order('fecha_inicio_limpieza', { ascending: false });

      if (kitsError) throw kitsError;

      // Para cada kit, cargar los productos de limpieza
      const kitsConProductos: KitLimpieza[] = [];

      for (const kit of kitsData || []) {
        const cirugia = (kit.cirugias as any);

        // Cargar productos de limpieza
        const { data: productosData, error: productosError } = await supabase
          .from('kit_productos_limpieza')
          .select(`
            id,
            kit_producto_id,
            producto_id,
            cantidad_a_recuperar,
            cantidad_aprobada,
            estado_limpieza,
            notas,
            observaciones_limpieza,
            productos!inner(
              nombre,
              codigo
            )
          `)
          .eq('kit_id', kit.id)
          .neq('es_desechable', true); // Solo productos reutilizables

        if (productosError) {
          console.error('Error cargando productos:', productosError);
          continue;
        }

        const productos: ProductoLimpieza[] = (productosData || []).map((p: any) => ({
          id: p.id,
          kit_producto_id: p.kit_producto_id,
          producto_id: p.producto_id,
          producto_nombre: p.productos.nombre,
          producto_codigo: p.productos.codigo,
          cantidad_a_recuperar: p.cantidad_a_recuperar || 0,
          cantidad_aprobada: p.cantidad_aprobada || 0,
          estado_limpieza: p.estado_limpieza || 'pendiente',
          notas: p.notas || '',
          observaciones_limpieza: p.observaciones_limpieza || ''
        }));

        kitsConProductos.push({
          id: kit.id,
          numero_kit: kit.numero_kit,
          cirugia_id: kit.cirugia_id,
          fecha_inicio_limpieza: kit.fecha_inicio_limpieza,
          estado: kit.estado,
          hospital: cirugia?.hospitales,
          medico_cirujano: cirugia?.medico_cirujano,
          cliente: cirugia?.clientes,
          productos,
          productos_count: productos.length
        });
      }

      this.kitsEnLimpieza.set(kitsConProductos);

    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      this.error.set(err.message || 'Error al cargar los datos');
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionarKit(kit: KitLimpieza) {
    this.kitSeleccionado.set(kit);
  }

  cerrarDetalle() {
    this.kitSeleccionado.set(null);
  }

  async cambiarEstadoProducto(producto: ProductoLimpieza, nuevoEstado: 'en_proceso' | 'esterilizado') {
    if (this.procesando()) return;

    try {
      this.procesando.set(true);

      const supabase = this.supabaseService.supabaseClient;

      const updates: any = {
        estado_limpieza: nuevoEstado,
        updated_at: new Date().toISOString()
      };

      if (nuevoEstado === 'en_proceso') {
        updates.procesado_por = this.usuarioId();
        updates.fecha_inicio_proceso = new Date().toISOString();
      } else if (nuevoEstado === 'esterilizado') {
        updates.fecha_fin_proceso = new Date().toISOString();
      }

      const { error } = await supabase
        .from('kit_productos_limpieza')
        .update(updates)
        .eq('id', producto.id);

      if (error) throw error;

      // Actualizar estado local
      const kit = this.kitSeleccionado();
      if (kit) {
        const productoIndex = kit.productos.findIndex(p => p.id === producto.id);
        if (productoIndex !== -1) {
          kit.productos[productoIndex].estado_limpieza = nuevoEstado;
          this.kitSeleccionado.set({ ...kit });

          // Actualizar también en la lista general
          const kits = this.kitsEnLimpieza();
          const kitIndex = kits.findIndex(k => k.id === kit.id);
          if (kitIndex !== -1) {
            kits[kitIndex] = { ...kit };
            this.kitsEnLimpieza.set([...kits]);
          }
        }
      }

      alert(`✅ Producto actualizado a estado: ${nuevoEstado}`);

    } catch (err: any) {
      console.error('Error al actualizar estado:', err);
      alert('Error al actualizar el estado del producto');
    } finally {
      this.procesando.set(false);
    }
  }

  async guardarObservaciones(producto: ProductoLimpieza) {
    try {
      const supabase = this.supabaseService.supabaseClient;

      const { error } = await supabase
        .from('kit_productos_limpieza')
        .update({
          observaciones_limpieza: producto.observaciones_limpieza,
          updated_at: new Date().toISOString()
        })
        .eq('id', producto.id);

      if (error) throw error;

      alert('✅ Observaciones guardadas');

    } catch (err: any) {
      console.error('Error al guardar observaciones:', err);
      alert('Error al guardar las observaciones');
    }
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-500';
      case 'en_proceso': return 'bg-blue-500';
      case 'esterilizado': return 'bg-green-500';
      case 'aprobado': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En Proceso';
      case 'esterilizado': return 'Esterilizado';
      case 'aprobado': return 'Aprobado';
      case 'desechado': return 'Desechado';
      default: return estado;
    }
  }

  regresar() {
    this.router.navigate(['/internal']);
  }
}
