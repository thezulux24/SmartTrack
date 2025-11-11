import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

interface ProductoDevolucion {
  id: string;
  producto_id: string;
  nombre: string;
  codigo: string;
  cantidad_enviada: number;
  cantidad_utilizada: number;
  cantidad_disponible: number; // enviada - utilizada
  es_desechable: boolean;
  requiere_limpieza: boolean; // true si fue utilizado
  cantidad_a_recuperar: number;
  notas: string;
}

interface KitDevolucion {
  id: string;
  numero_kit: string;
  cirugia_id: string;
  fecha_devolucion: string;
  hospital?: { nombre: string };
  medico_cirujano?: string;
  cliente?: { nombre: string; apellido: string };
}

@Component({
  selector: 'app-tecnico-procesar-devolucion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tecnico-procesar-devolucion.component.html',
  styleUrl: './tecnico-procesar-devolucion.component.css'
})
export class TecnicoProcesamDevolucionComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  kitId = signal<string>('');
  kit = signal<KitDevolucion | null>(null);
  productos = signal<ProductoDevolucion[]>([]);
  cargando = signal<boolean>(true);
  procesando = signal<boolean>(false);
  error = signal<string>('');

  totalProductos = computed(() => this.productos().length);
  totalDesechables = computed(() => 
    this.productos().filter(p => p.es_desechable).length
  );
  totalReutilizables = computed(() => 
    this.productos().filter(p => !p.es_desechable).length
  );
  totalARecuperar = computed(() => 
    this.productos().reduce((sum, p) => sum + p.cantidad_a_recuperar, 0)
  );
  // ✅ TODO va a limpieza (reutilizables)
  totalALimpieza = computed(() =>
    this.productos().filter(p => !p.es_desechable && p.cantidad_a_recuperar > 0).length
  );

  Math = Math;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('kitId');
    if (id) {
      this.kitId.set(id);
      this.cargarDatosKit();
    } else {
      this.error.set('ID de kit no encontrado');
      this.cargando.set(false);
    }
  }

  async cargarDatosKit() {
    try {
      this.cargando.set(true);
      this.error.set('');

      const supabase = this.supabaseService.supabaseClient;

      // Cargar kit con información de cirugía
      const { data: kitData, error: kitError } = await supabase
        .from('kits_cirugia')
        .select(`
          id,
          numero_kit,
          cirugia_id,
          fecha_devolucion,
          estado,
          cirugias!inner(
            id,
            medico_cirujano,
            hospitales(nombre),
            clientes(nombre, apellido)
          )
        `)
        .eq('id', this.kitId())
        .eq('estado', 'devuelto')
        .single();

      if (kitError) throw kitError;
      if (!kitData) throw new Error('Kit no encontrado o no está en estado devuelto');

      const cirugia = kitData.cirugias as any;
      this.kit.set({
        id: kitData.id,
        numero_kit: kitData.numero_kit,
        cirugia_id: kitData.cirugia_id,
        fecha_devolucion: kitData.fecha_devolucion,
        hospital: cirugia?.hospitales,
        medico_cirujano: cirugia?.medico_cirujano,
        cliente: cirugia?.clientes
      });

      // Cargar productos del kit con información de productos
      const { data: productosData, error: productosError } = await supabase
        .from('kit_productos')
        .select(`
          id,
          producto_id,
          cantidad_enviada,
          cantidad_utilizada,
          productos!inner(
            id,
            nombre,
            codigo
          )
        `)
        .eq('kit_id', this.kitId());

      if (productosError) throw productosError;

      // Mapear productos con valores iniciales
      const productosDevolucion: ProductoDevolucion[] = (productosData || []).map((kp: any) => {
        const producto = (kp.productos as any);
        const cantidadEnviada = kp.cantidad_enviada || 0;
        const cantidadUtilizada = kp.cantidad_utilizada || 0;
        const cantidadDisponible = cantidadEnviada - cantidadUtilizada;
        
        // ✅ TODO lo enviado se puede recuperar (utilizado + no utilizado)
        const cantidadARecuperar = cantidadEnviada;
        
        return {
          id: kp.id,
          producto_id: kp.producto_id,
          nombre: producto.nombre,
          codigo: producto.codigo,
          cantidad_enviada: kp.cantidad_enviada || 0,
          cantidad_utilizada: cantidadUtilizada,
          cantidad_disponible: cantidadDisponible,
          es_desechable: false, // Por defecto no es desechable
          requiere_limpieza: true, // ✅ TODO requiere limpieza
          cantidad_a_recuperar: cantidadARecuperar,
          notas: ''
        };
      });

      this.productos.set(productosDevolucion);

    } catch (err: any) {
      console.error('Error al cargar datos del kit:', err);
      this.error.set(err.message || 'Error al cargar los datos');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleDesechable(producto: ProductoDevolucion) {
    const productos = this.productos();
    const index = productos.findIndex(p => p.id === producto.id);
    if (index !== -1) {
      productos[index].es_desechable = !productos[index].es_desechable;
      
      // Si es desechable, cantidad a recuperar es 0
      if (productos[index].es_desechable) {
        productos[index].cantidad_a_recuperar = 0;
      } else {
        // Si no es desechable, recuperar todo lo disponible
        productos[index].cantidad_a_recuperar = productos[index].cantidad_disponible;
      }
      
      this.productos.set([...productos]);
    }
  }

  ajustarCantidadRecuperar(producto: ProductoDevolucion, cambio: number) {
    const productos = this.productos();
    const index = productos.findIndex(p => p.id === producto.id);
    if (index !== -1 && !productos[index].es_desechable) {
      // El máximo depende de si el producto fue utilizado o no:
      // - Utilizado → máximo = cantidad_utilizada (lo que se puede recuperar de limpieza)
      // - No utilizado → máximo = cantidad_disponible (lo que quedó sin usar)
      const cantidadMaxima = productos[index].requiere_limpieza 
        ? productos[index].cantidad_utilizada 
        : productos[index].cantidad_disponible;
      
      const nuevaCantidad = Math.max(0, 
        Math.min(cantidadMaxima, productos[index].cantidad_a_recuperar + cambio)
      );
      productos[index].cantidad_a_recuperar = nuevaCantidad;
      this.productos.set([...productos]);
    }
  }

  async confirmarProcesamiento() {
    if (this.procesando()) return;

    const confirmacion = confirm(
      `¿Confirmar procesamiento de devolución?\n\n` +
      `Total productos: ${this.totalProductos()}\n` +
      `Desechables: ${this.totalDesechables()}\n` +
      `Reutilizables: ${this.totalReutilizables()}\n` +
      `  → A limpieza: ${this.totalALimpieza()}\n` +
      `Cantidad total a recuperar: ${this.totalARecuperar()}\n\n` +
      `Todos los productos reutilizables serán enviados a limpieza y esterilización.`
    );

    if (!confirmacion) return;

    try {
      this.procesando.set(true);
      this.error.set('');

      const supabase = this.supabaseService.supabaseClient;
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // ✅ Todos los productos reutilizables van a limpieza
      const productosALimpieza = this.productos().filter(
        p => !p.es_desechable && p.cantidad_a_recuperar > 0
      );

      // 1. Actualizar kit_productos con información de recuperación
      for (const producto of this.productos()) {
        const { error: updateError } = await supabase
          .from('kit_productos')
          .update({
            cantidad_recuperable: producto.cantidad_a_recuperar,
            es_desechable: producto.es_desechable,
            notas_devolucion: producto.notas
          })
          .eq('id', producto.id);

        if (updateError) console.error('Error actualizando producto:', updateError);
      }

      // 2. Todos los productos reutilizables → Crear registros en kit_productos_limpieza
      for (const producto of productosALimpieza) {
        const { error: limpiezaError } = await supabase
          .from('kit_productos_limpieza')
          .insert({
            kit_producto_id: producto.id,
            kit_id: this.kitId(),
            producto_id: producto.producto_id,
            cantidad_a_recuperar: producto.cantidad_a_recuperar,
            cantidad_aprobada: 0,
            es_desechable: false,
            estado_limpieza: 'pendiente',
            estado: 'enviado_limpieza',
            notas: producto.notas,
            procesado_por: userId,
            fecha_inicio_proceso: new Date().toISOString()
          });

        if (limpiezaError) console.error('Error creando registro limpieza:', limpiezaError);
      }

      // 3. Determinar estado del kit
      let nuevoEstado = 'finalizado';
      let fechaFinalizacion = null;

      if (productosALimpieza.length > 0) {
        // Si hay productos a limpieza, kit va a 'en_limpieza'
        nuevoEstado = 'en_limpieza';
      } else {
        // Si solo hay desechables, kit se finaliza
        nuevoEstado = 'finalizado';
        fechaFinalizacion = new Date().toISOString();
      }

      // Actualizar estado del kit
      const updateData: any = {
        estado: nuevoEstado
      };

      if (nuevoEstado === 'en_limpieza') {
        updateData.fecha_inicio_limpieza = new Date().toISOString();
      } else if (nuevoEstado === 'finalizado') {
        updateData.fecha_fin_limpieza = fechaFinalizacion;
      }

      const { error: kitError } = await supabase
        .from('kits_cirugia')
        .update(updateData)
        .eq('id', this.kitId());

      if (kitError) throw kitError;

      // 4. Registrar en trazabilidad
      const { error: trazError } = await supabase
        .from('cirugia_trazabilidad')
        .insert({
          cirugia_id: this.kit()?.cirugia_id,
          accion: 'devolucion_procesada',
          estado_anterior: 'devuelto',
          estado_nuevo: nuevoEstado,
          usuario_id: userId,
          observaciones: `Devolución procesada: ${this.totalReutilizables()} productos reutilizables, ${this.totalDesechables()} desechables. Total a recuperar: ${this.totalARecuperar()}. Todos los reutilizables enviados a limpieza: ${productosALimpieza.length}`,
          metadata: {
            kit_id: this.kitId(),
            total_productos: this.totalProductos(),
            total_desechables: this.totalDesechables(),
            total_reutilizables: this.totalReutilizables(),
            total_a_limpieza: productosALimpieza.length,
            cantidad_a_recuperar: this.totalARecuperar(),
            productos: this.productos().map(p => ({
              nombre: p.nombre,
              codigo: p.codigo,
              es_desechable: p.es_desechable,
              requiere_limpieza: p.requiere_limpieza,
              cantidad_a_recuperar: p.cantidad_a_recuperar
            }))
          }
        });

      if (trazError) console.error('Error en trazabilidad:', trazError);

      // Mensaje de éxito personalizado
      let mensaje = '✅ Devolución procesada exitosamente\n\n';
      
      if (productosALimpieza.length > 0) {
        mensaje += `✓ ${productosALimpieza.length} producto(s) enviado(s) a limpieza y esterilización\n`;
      }
      
      if (this.totalDesechables() > 0) {
        mensaje += `✓ ${this.totalDesechables()} producto(s) marcado(s) como desechables\n`;
      }

      mensaje += `\nKit ${this.kit()?.numero_kit}: ${nuevoEstado === 'finalizado' ? 'FINALIZADO' : 'EN PROCESO DE LIMPIEZA'}`;

      alert(mensaje);

      this.router.navigate(['/internal/tecnico']);

    } catch (err: any) {
      console.error('Error al procesar devolución:', err);
      this.error.set(err.message || 'Error al procesar la devolución');
    } finally {
      this.procesando.set(false);
    }
  }

  regresar() {
    this.router.navigate(['/internal/tecnico']);
  }
}
